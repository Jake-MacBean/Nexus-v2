import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeAll, describe, expect, test } from 'vitest';

import { loadContractRegistry } from '../architecture/contracts/validator.ts';
import {
  checkEnvironmentGovernance,
  isCredentialBearingRemoteUrl,
  loadEnvironmentRegistry,
  validateEnvironmentReferences,
  validateEnvironmentRegistry,
  validateEnvExample,
  validateTrackedEnvironmentFiles,
  type EnvironmentReference,
} from './environment.ts';
import {
  ensureGitleaks,
  executeGitleaksScan,
  requireCleanGitleaksResult,
  scanGitHistory,
  scanWorkingTree,
  validateGitleaksPolicy,
} from './gitleaks.ts';
import { gitleaksAssets, gitleaksVersion } from './gitleaks-manifest.ts';
import type { EnvironmentRegistry } from './schema.ts';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const temporaryDirectories: string[] = [];
let binaryPath: string;
let environmentRegistry: EnvironmentRegistry;

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function syntheticSecret(): string {
  return randomBytes(32).toString('hex');
}

async function syntheticScanDirectory(): Promise<{ directory: string; secret: string }> {
  const directory = await temporaryDirectory('nexus-security-dir-');
  const secret = syntheticSecret();
  await writeFile(
    path.join(directory, 'synthetic.txt'),
    ['api', '_key = "', secret, '"\n'].join(''),
  );
  await copyFile(path.join(rootDir, '.gitleaks.toml'), path.join(directory, '.gitleaks.toml'));
  await writeFile(path.join(directory, '.gitleaksignore'), '');
  return { directory, secret };
}

function git(directory: string, ...arguments_: string[]): void {
  const result = spawnSync('git', arguments_, {
    cwd: directory,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error(`Synthetic Git command failed.`);
}

function mutableRegistry(): Record<string, unknown> {
  return structuredClone(environmentRegistry) as unknown as Record<string, unknown>;
}

beforeAll(async () => {
  binaryPath = await ensureGitleaks(rootDir);
  environmentRegistry = await loadEnvironmentRegistry(rootDir);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('pinned Gitleaks enforcement', () => {
  test('validates the exact pinned Gitleaks version and binary', () => {
    expect(gitleaksVersion).toBe('8.30.1');
    expect(gitleaksAssets['win32-x64']?.archiveSha256).toHaveLength(64);
    const result = spawnSync(binaryPath, ['version'], { encoding: 'utf8', windowsHide: true });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(gitleaksVersion);
  });

  test('passes the clean relevant working tree and full Git history', async () => {
    await expect(scanWorkingTree(rootDir, binaryPath)).resolves.toBeUndefined();
    await expect(scanGitHistory(rootDir, binaryPath)).resolves.toBeUndefined();
  });

  test('detects a runtime-generated directory leak and fully redacts it', async () => {
    const { directory, secret } = await syntheticScanDirectory();
    const result = await executeGitleaksScan({
      binaryPath,
      mode: 'dir',
      source: '.',
      configPath: path.join(directory, '.gitleaks.toml'),
      ignorePath: path.join(directory, '.gitleaksignore'),
      cwd: directory,
    });
    expect(result.exitCode).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.Secret).toBe('REDACTED');
    expect(result.output).not.toContain(secret);
    expect(result.reportText).not.toContain(secret);
  });

  test('detects a runtime-generated historical leak and fully redacts it', async () => {
    const { directory, secret } = await syntheticScanDirectory();
    git(directory, 'init', '--quiet');
    git(directory, 'config', 'user.email', 'synthetic@nexus.invalid');
    git(directory, 'config', 'user.name', 'Nexus Synthetic Test');
    git(directory, 'add', '.');
    git(directory, 'commit', '--quiet', '-m', 'synthetic security fixture');
    const result = await executeGitleaksScan({
      binaryPath,
      mode: 'git',
      source: '.',
      configPath: path.join(directory, '.gitleaks.toml'),
      ignorePath: path.join(directory, '.gitleaksignore'),
      cwd: directory,
    });
    expect(result.exitCode).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.Commit).toMatch(/^[0-9a-f]{40}$/u);
    expect(result.output).not.toContain(secret);
    expect(result.reportText).not.toContain(secret);
  });

  test('turns scanner findings into a nonzero actionable redacted failure', async () => {
    const { directory } = await syntheticScanDirectory();
    const result = await executeGitleaksScan({
      binaryPath,
      mode: 'dir',
      source: '.',
      configPath: path.join(directory, '.gitleaks.toml'),
      ignorePath: path.join(directory, '.gitleaksignore'),
      cwd: directory,
    });
    await expect(requireCleanGitleaksResult('synthetic', result)).rejects.toThrow(
      /potential secret.*fully redacted/isu,
    );
  });

  test('bootstraps a missing cache only from integrity-verified official bytes', async () => {
    const cacheRoot = await temporaryDirectory('nexus-security-bootstrap-');
    const provisionedCache = path.dirname(binaryPath);
    const download = async (url: string): Promise<Uint8Array> =>
      new Uint8Array(
        await readFile(path.join(provisionedCache, path.basename(new URL(url).pathname))),
      );
    await expect(ensureGitleaks(rootDir, { cacheRoot, download })).resolves.toContain(cacheRoot);
  });

  test('fails closed when downloaded scanner bytes do not match the official checksum', async () => {
    const cacheRoot = await temporaryDirectory('nexus-security-bad-download-');
    await expect(
      ensureGitleaks(rootDir, {
        cacheRoot,
        download: async () => randomBytes(64),
      }),
    ).rejects.toThrow(/integrity check failed/u);
  });

  test('rejects broad or unreviewed allowlists', () => {
    expect(() =>
      validateGitleaksPolicy('[extend]\nuseDefault = true\n[[allowlists]]\npaths = [".*"]\n', ''),
    ).toThrow(/unapproved rule or allowlist|broad wildcard/u);
  });
});

describe('environment governance', () => {
  test('passes the canonical registry, example, references, and tracked-file policy', async () => {
    const result = await checkEnvironmentGovernance(rootDir);
    expect(result.registry.variables).toHaveLength(14);
    expect(result.references.length).toBeGreaterThan(0);
  });

  test('rejects a tracked real environment file', () => {
    expect(validateTrackedEnvironmentFiles(['.env'], environmentRegistry)).toEqual([
      'Tracked environment file is prohibited: .env.',
    ]);
  });

  test('accepts the approved local-safe .env.example', async () => {
    expect(
      validateEnvExample(
        await readFile(path.join(rootDir, '.env.example'), 'utf8'),
        environmentRegistry,
      ),
    ).toEqual([]);
  });

  test('rejects an unapproved secret-like value in .env.example', async () => {
    const content = (await readFile(path.join(rootDir, '.env.example'), 'utf8')).replace(
      /^DATABASE_URL=.*$/mu,
      [
        'DATABASE_URL=postgresql://service:',
        syntheticSecret(),
        '@db.example.invalid/production',
      ].join(''),
    );
    expect(validateEnvExample(content, environmentRegistry)).toContain(
      'DATABASE_URL does not use an explicitly approved committed example value.',
    );
  });

  test('rejects an unregistered environment-variable reference', () => {
    const reference: EnvironmentReference = {
      name: 'UNREGISTERED_NEXUS_VALUE',
      surface: 'process.env',
      file: 'synthetic.ts',
      line: 1,
    };
    expect(validateEnvironmentReferences([reference], environmentRegistry)[0]).toMatch(
      /unregistered/u,
    );
  });

  test('accepts a registered server variable', () => {
    expect(
      validateEnvironmentReferences(
        [{ name: 'API_PORT', surface: 'process.env', file: 'server.ts', line: 1 }],
        environmentRegistry,
      ),
    ).toEqual([]);
  });

  test('accepts a registered safe public client variable', () => {
    expect(
      validateEnvironmentReferences(
        [
          {
            name: 'VITE_API_BASE_URL',
            surface: 'import.meta.env',
            file: 'web.ts',
            line: 1,
          },
        ],
        environmentRegistry,
      ),
    ).toEqual([]);
  });

  test('rejects credential-bearing remote URLs but permits the approved loopback form', () => {
    expect(
      isCredentialBearingRemoteUrl(
        ['postgresql://service:', syntheticSecret(), '@db.example.invalid/production'].join(''),
      ),
    ).toBe(true);
    expect(
      isCredentialBearingRemoteUrl(
        'postgresql://nexus_v2_dev:nexus_v2_dev_local_only@127.0.0.1:55432/nexus_v2_dev',
      ),
    ).toBe(false);
  });

  test('rejects client-visible secret classification', () => {
    const registry = mutableRegistry();
    const variables = registry.variables as Array<Record<string, unknown>>;
    const client = variables.find(({ name }) => name === 'VITE_API_BASE_URL');
    if (!client) throw new Error('Synthetic registry fixture is missing VITE_API_BASE_URL.');
    client.sensitivity = 'secret';
    expect(() => validateEnvironmentRegistry(registry)).toThrow(/client visibility.*secret/u);
  });

  test('rejects a secret-like VITE variable name', () => {
    const registry = mutableRegistry();
    const variables = registry.variables as Array<Record<string, unknown>>;
    const client = variables.find(({ name }) => name === 'VITE_API_BASE_URL');
    if (!client) throw new Error('Synthetic registry fixture is missing VITE_API_BASE_URL.');
    client.name = 'VITE_PRIVATE_TOKEN';
    expect(() => validateEnvironmentRegistry(registry)).toThrow(/secret-like name/u);
  });

  test('rejects DATABASE_URL as client-visible', () => {
    const registry = mutableRegistry();
    const variables = registry.variables as Array<Record<string, unknown>>;
    const database = variables.find(({ name }) => name === 'DATABASE_URL');
    if (!database) throw new Error('Synthetic registry fixture is missing DATABASE_URL.');
    database.visibility = 'client';
    expect(() => validateEnvironmentRegistry(registry)).toThrow(/DATABASE_URL cannot be client/u);
  });

  test('requires no remote credential or provider access', async () => {
    await expect(fetch('https://provider.example.invalid/security-test')).rejects.toThrow(
      /Unexpected fetch in a unit test/u,
    );
  });
});

describe('security governance integration', () => {
  test('resolves AC-021 security evidence through the contract registry', async () => {
    const registry = await loadContractRegistry(rootDir);
    const contract = registry.contracts.find(({ id }) => id === 'AC-021');
    expect(contract?.enforcement.static.evidence).toContain('security-check-command');
  });

  test('keeps security verification Docker-, provider-, and AI-free', async () => {
    const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts.verify).toContain('pnpm security:check');
    expect(packageJson.scripts.verify).toContain('pnpm security:test');
    expect(packageJson.scripts['security:check']).not.toMatch(/docker|infra:|eval|provider/iu);
  });
});
