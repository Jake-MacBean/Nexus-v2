import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test } from 'vitest';

import { evaluationCatalog } from '../../evaluations/catalog.ts';
import {
  createContractStatusDocument,
  formatContractMatrix,
  serializeContractStatus,
} from './report.ts';
import { canonicalContractTitles } from './schema.ts';
import { defineContractTestEvidence } from './test-definition.ts';
import { validateContractRegistry, type RegistryValidationContext } from './validator.ts';

interface MutableEvidence {
  id: string;
  kind: string;
  reference: string;
  description: string;
}

interface MutableChannel {
  status: string;
  evidence: string[];
  reason: string;
}

interface MutableContract {
  id: string;
  title: string;
  owner: { kind: string; boundary: string };
  primaryPhases: string[];
  enforcement: Record<string, MutableChannel>;
}

interface MutableRegistry {
  schemaVersion: number;
  canonicalSource: Record<string, unknown>;
  phases: Array<{ id: string; title: string }>;
  evidenceCatalog: MutableEvidence[];
  contracts: MutableContract[];
}

let canonicalFixture: MutableRegistry;
let validationContext: RegistryValidationContext;

function fixture(): MutableRegistry {
  return structuredClone(canonicalFixture);
}

function contract(value: MutableRegistry, id: string): MutableContract {
  const found = value.contracts.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Test fixture contract ${id} is missing.`);
  return found;
}

function evidence(value: MutableRegistry, id: string): MutableEvidence {
  const found = value.evidenceCatalog.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Test fixture evidence ${id} is missing.`);
  return found;
}

async function expectInvalid(value: MutableRegistry, pattern: RegExp): Promise<void> {
  await expect(validateContractRegistry(value, validationContext)).rejects.toThrow(pattern);
}

beforeAll(async () => {
  canonicalFixture = JSON.parse(
    await readFile(
      new URL('../../docs/architecture/contracts.registry.json', import.meta.url),
      'utf8',
    ),
  ) as MutableRegistry;
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };
  validationContext = {
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    commands: new Set(Object.keys(packageJson.scripts ?? {})),
    evaluationStatuses: new Map(
      evaluationCatalog.map(({ id, implementationStatus }) => [id, implementationStatus]),
    ),
  };
});

describe('canonical Architecture Contract registry', () => {
  test('registers exactly 25 contracts', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    expect(registry.contracts).toHaveLength(25);
  });

  test('registers AC-001 through AC-025 without gaps', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    expect(registry.contracts.map(({ id }) => id)).toEqual(
      Array.from({ length: 25 }, (_, index) => `AC-${String(index + 1).padStart(3, '0')}`),
    );
  });

  test('preserves every exact canonical title', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    expect(Object.fromEntries(registry.contracts.map(({ id, title }) => [id, title]))).toEqual(
      canonicalContractTitles,
    );
  });

  test('rejects duplicate contract IDs', async () => {
    const value = fixture();
    value.contracts[24] = structuredClone(value.contracts[23]!);
    await expectInvalid(value, /duplicates: AC-024/u);
  });

  test('rejects a missing canonical contract', async () => {
    const value = fixture();
    value.contracts = value.contracts.filter(({ id }) => id !== 'AC-025');
    await expectInvalid(value, /missing AC-025/u);
  });

  test('rejects an unknown contract ID', async () => {
    const value = fixture();
    contract(value, 'AC-025').id = 'AC-999';
    await expectInvalid(value, /unknown ID AC-999/u);
  });

  test('rejects missing owner metadata', async () => {
    const value = fixture();
    contract(value, 'AC-001').owner.boundary = '';
    await expectInvalid(value, /AC-001.owner.boundary must be a non-empty string/u);
  });

  test('rejects invalid phase metadata', async () => {
    const value = fixture();
    contract(value, 'AC-001').primaryPhases[0] = 'phase-99';
    await expectInvalid(value, /AC-001.primaryPhases must be one of/u);
  });

  test('rejects a missing or unknown enforcement channel', async () => {
    const missing = fixture();
    delete contract(missing, 'AC-001').enforcement.runtime;
    await expectInvalid(missing, /missing channel runtime/u);

    const unknown = fixture();
    contract(unknown, 'AC-001').enforcement.automatic = {
      status: 'planned',
      evidence: [],
      reason: 'Invalid test fixture only.',
    };
    await expectInvalid(unknown, /unknown channel automatic/u);
  });

  test('rejects an unknown enforcement status', async () => {
    const value = fixture();
    contract(value, 'AC-001').enforcement.static!.status = 'registered';
    await expectInvalid(value, /must be one of: enforced, partial, planned/u);
  });

  test('rejects enforced or partial claims without concrete evidence', async () => {
    const value = fixture();
    contract(value, 'AC-001').enforcement.static = {
      status: 'enforced',
      evidence: [],
      reason: 'Dishonest negative fixture.',
    };
    await expectInvalid(value, /status enforced requires concrete evidence/u);
  });

  test('rejects a missing referenced repository path', async () => {
    const value = fixture();
    evidence(value, 'architecture-policy').reference = 'architecture/does-not-exist.mjs';
    await expectInvalid(value, /path does not exist/u);
  });

  test('rejects a missing referenced root command', async () => {
    const value = fixture();
    evidence(value, 'verify-command').reference = 'verify:imaginary';
    await expectInvalid(value, /command does not exist/u);
  });

  test('rejects a missing referenced evaluation scenario', async () => {
    const value = fixture();
    evidence(value, 'eval-authority').reference = 'authority.does-not-exist';
    await expectInvalid(value, /evaluation scenario does not exist/u);
  });

  test('rejects treating a planned evaluation as enforced', async () => {
    const value = fixture();
    contract(value, 'AC-004').enforcement.eval!.status = 'enforced';
    await expectInvalid(value, /cannot claim enforced from planned scenario/u);
  });

  test('keeps planned and not-yet-executable contracts valid and visible', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    const authority = registry.contracts.find(({ id }) => id === 'AC-004');
    expect(authority?.enforcement).toMatchObject({
      static: { status: 'planned' },
      runtime: { status: 'not_yet_executable' },
      eval: { status: 'planned' },
    });
  });

  test('sorts contract listing deterministically', async () => {
    const value = fixture();
    value.contracts.reverse();
    const registry = await validateContractRegistry(value, validationContext);
    expect(registry.contracts[0]?.id).toBe('AC-001');
    expect(registry.contracts[24]?.id).toBe('AC-025');
  });
});

describe('contract status and test convention', () => {
  test('generates deterministic human-readable status with uncovered runtime work visible', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    expect(formatContractMatrix(registry)).toBe(formatContractMatrix(registry));
    expect(formatContractMatrix(registry)).toContain('AC-016 | External Clients Are Portals');
    expect(formatContractMatrix(registry)).toContain('not_yet_executable');
  });

  test('generates a stable machine-readable status schema', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    const status = JSON.parse(serializeContractStatus(registry)) as Record<string, unknown>;
    expect(status).toMatchObject({
      schemaVersion: 1,
      summary: { totalContracts: 25, reviewRequired: 25 },
    });
    expect(createContractStatusDocument(registry).contracts[0]?.id).toBe('AC-001');
  });

  test('resolves existing evidence without importing or changing product applications', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    expect(registry.evidenceCatalog.some(({ reference }) => reference.startsWith('apps/'))).toBe(
      false,
    );
  });

  test('does not represent an unimplemented runtime contract as passing or enforced', async () => {
    const registry = await validateContractRegistry(fixture(), validationContext);
    const authority = registry.contracts.find(({ id }) => id === 'AC-004');
    expect(authority?.enforcement.runtime).toEqual({
      status: 'not_yet_executable',
      evidence: [],
      reason: 'The Authority Engine and consequential actions do not exist.',
    });
  });

  test('defines future contract-test evidence without creating another runner', () => {
    expect(
      defineContractTestEvidence({
        contractId: 'AC-004',
        evidenceType: 'runtime',
        suiteId: 'authority-adapter-parity',
        testId: 'all-adapters-use-authority',
        applicablePhase: 'phase-1',
        status: 'planned',
        description: 'Future parity test metadata only.',
      }),
    ).toMatchObject({ contractId: 'AC-004', status: 'planned' });
  });

  test('integrates contract validation into provider-free verify', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts.verify).toContain('pnpm contracts:check');
    expect(packageJson.scripts.verify).toContain('pnpm contracts:test');
    expect(packageJson.scripts.verify).not.toMatch(/infra:up|test:integration|db:local:up/u);
    await expect(fetch('https://provider.example.test/contract-validation')).rejects.toThrow(
      /Unexpected fetch in a unit test/u,
    );
  });
});
