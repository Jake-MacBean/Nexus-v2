import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { formatArchitectureReport, validateArchitecture } from './checker.mjs';

const createdFixtures = [];
const architectureCommand = fileURLToPath(new URL('./check.mjs', import.meta.url));

async function createFixture({ apps = {}, packages = {} }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-architecture-'));
  createdFixtures.push(root);
  await Promise.all([
    mkdir(path.join(root, 'apps'), { recursive: true }),
    mkdir(path.join(root, 'packages'), { recursive: true }),
  ]);

  for (const [group, workspaces] of Object.entries({ apps, packages })) {
    for (const [id, definition] of Object.entries(workspaces)) {
      const workspaceRoot = path.join(root, group, id);
      await mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
      await writeFile(
        path.join(workspaceRoot, 'package.json'),
        `${JSON.stringify(
          {
            name: `@nexus-v2/${id}`,
            private: true,
            type: 'module',
            exports: group === 'packages' ? { '.': { import: './dist/index.js' } } : undefined,
            dependencies: Object.fromEntries(
              (definition.dependencies ?? []).map((dependency) => [
                `@nexus-v2/${dependency}`,
                'workspace:*',
              ]),
            ),
            devDependencies: Object.fromEntries(
              (definition.devDependencies ?? []).map((dependency) => [
                `@nexus-v2/${dependency}`,
                'workspace:*',
              ]),
            ),
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(
        path.join(workspaceRoot, 'src', 'index.ts'),
        definition.source ?? 'export {};\n',
      );
      for (const [relativePath, contents] of Object.entries(definition.files ?? {})) {
        const filePath = path.join(workspaceRoot, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, contents);
      }
    }
  }
  return root;
}

test.after(async () => {
  await Promise.all(
    createdFixtures.map((fixture) => rm(fixture, { recursive: true, force: true })),
  );
});

async function expectViolation(fixture, code) {
  const report = await validateArchitecture(fixture);
  const match = report.violations.find((item) => item.code === code);
  assert.ok(match, `${code} not found in:\n${formatArchitectureReport(report)}`);
  assert.ok(match.importer);
  assert.ok(match.file);
  assert.ok(match.imported);
  assert.ok(match.rule);
  return report;
}

test('accepts public imports across several permitted dependency directions', async () => {
  const fixture = await createFixture({
    apps: {
      web: {
        dependencies: ['contracts', 'workspaces'],
        source:
          "import type { Contract } from '@nexus-v2/contracts';\nexport { workspace } from '@nexus-v2/workspaces';\n",
      },
    },
    packages: {
      kernel: {},
      contracts: {
        dependencies: ['kernel'],
        source: "export type { KernelId } from '@nexus-v2/kernel';\n",
      },
      events: {
        dependencies: ['kernel', 'contracts'],
        source:
          "import type { KernelId } from '@nexus-v2/kernel';\nexport type { Contract } from '@nexus-v2/contracts';\n",
      },
      cortex: {
        dependencies: ['kernel', 'contracts', 'events'],
        source:
          "import type { KernelId } from '@nexus-v2/kernel';\nimport type { Contract } from '@nexus-v2/contracts';\nexport { event } from '@nexus-v2/events';\n",
      },
      application: {
        dependencies: ['cortex', 'events'],
        source:
          "import type { Cortex } from '@nexus-v2/cortex';\nexport { event } from '@nexus-v2/events';\n",
      },
      workspaces: {
        dependencies: ['contracts', 'application'],
        source:
          "import type { Contract } from '@nexus-v2/contracts';\nexport { command } from '@nexus-v2/application';\n",
      },
    },
  });
  const report = await validateArchitecture(fixture);
  assert.equal(report.violations.length, 0, formatArchitectureReport(report));
});

test('accepts relative imports that remain inside one workspace', async () => {
  const fixture = await createFixture({
    packages: {
      kernel: {
        source: "export { localValue } from './local.js';\n",
        files: { 'src/local.ts': 'export const localValue = true;\n' },
      },
    },
  });
  const report = await validateArchitecture(fixture);
  assert.equal(report.violations.length, 0, formatArchitectureReport(report));
});

test('rejects packages importing apps', async () => {
  const fixture = await createFixture({
    apps: { api: {} },
    packages: {
      kernel: {
        dependencies: ['api'],
        source: "import '@nexus-v2/api';\n",
      },
    },
  });
  await expectViolation(fixture, 'PACKAGE_TO_APP');
});

test('rejects direct domain-to-domain imports', async () => {
  const fixture = await createFixture({
    packages: {
      cortex: {
        dependencies: ['loop'],
        source: "import '@nexus-v2/loop';\n",
      },
      loop: {},
    },
  });
  await expectViolation(fixture, 'DOMAIN_TO_DOMAIN');
});

for (const [target, code] of [
  ['database', 'DOMAIN_TO_DATABASE'],
  ['ai', 'DOMAIN_TO_AI'],
  ['integrations', 'DOMAIN_TO_INTEGRATIONS'],
]) {
  test(`rejects domain imports from the ${target} adapter`, async () => {
    const fixture = await createFixture({
      packages: {
        cortex: {
          dependencies: [target],
          source: `import '@nexus-v2/${target}';\n`,
        },
        [target]: {},
      },
    });
    await expectViolation(fixture, code);
  });
}

test('rejects deep package implementation imports', async () => {
  const fixture = await createFixture({
    packages: {
      cortex: {},
      application: {
        dependencies: ['cortex'],
        source: "import '@nexus-v2/cortex/src/internal.js';\n",
      },
    },
  });
  await expectViolation(fixture, 'DEEP_PACKAGE_IMPORT');
});

test('rejects production source importing the testing package', async () => {
  const fixture = await createFixture({
    packages: {
      application: {
        devDependencies: ['testing'],
        source: "import '@nexus-v2/testing';\n",
      },
      testing: {},
    },
  });
  await expectViolation(fixture, 'PRODUCTION_TO_TESTING');
});

test('rejects circular package dependencies', async () => {
  const fixture = await createFixture({
    packages: {
      kernel: {
        dependencies: ['contracts'],
        source: "import '@nexus-v2/contracts';\n",
      },
      contracts: {
        dependencies: ['kernel'],
        source: "import '@nexus-v2/kernel';\n",
      },
    },
  });
  await expectViolation(fixture, 'CIRCULAR_PACKAGE_DEPENDENCY');
});

test('rejects unknown Nexus imports', async () => {
  const fixture = await createFixture({
    packages: {
      kernel: {
        dependencies: ['missing'],
        source: "import '@nexus-v2/missing';\n",
      },
    },
  });
  await expectViolation(fixture, 'UNKNOWN_NEXUS_IMPORT');
});

test('formats violations with importer, file, import, and rule', async () => {
  const fixture = await createFixture({
    packages: {
      cortex: {
        dependencies: ['database'],
        source: "import '@nexus-v2/database';\n",
      },
      database: {},
    },
  });
  const report = await expectViolation(fixture, 'DOMAIN_TO_DATABASE');
  const output = formatArchitectureReport(report);
  assert.match(output, /packages\/cortex\/src\/index\.ts/);
  assert.match(output, /importer: @nexus-v2\/cortex/);
  assert.match(output, /import: @nexus-v2\/database/);
  assert.match(output, /rule: Domain packages must not depend/);
});

test('architecture command exits nonzero and prints useful fixture violations', async () => {
  const fixture = await createFixture({
    packages: {
      cortex: {
        dependencies: ['ai'],
        source: "import '@nexus-v2/ai';\n",
      },
      ai: {},
    },
  });
  const result = spawnSync(process.execPath, [architectureCommand], {
    cwd: fixture,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[DOMAIN_TO_AI\]/);
  assert.match(result.stderr, /packages\/cortex\/src\/index\.ts/);
  assert.match(result.stderr, /importer: @nexus-v2\/cortex/);
  assert.match(result.stderr, /import: @nexus-v2\/ai/);
  assert.match(result.stderr, /rule: Domain packages must not depend/);
});
