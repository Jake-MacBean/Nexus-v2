import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { evaluationCatalog } from '../../evaluations/catalog.ts';
import {
  canonicalContractTitles,
  canonicalPrimaryPhases,
  enforcementChannels,
  enforcementStatuses,
  evidenceKinds,
  ownerKinds,
  phaseDefinitions,
  type ContractId,
  type ContractRegistry,
  type ContractRegistryEntry,
  type EnforcementChannel,
  type EnforcementStatus,
  type EvidenceDefinition,
  type EvidenceKind,
  type OwnerKind,
  type PhaseId,
} from './schema.ts';

export interface RegistryValidationContext {
  readonly rootDir: string;
  readonly commands: ReadonlySet<string>;
  readonly evaluationStatuses: ReadonlyMap<string, string>;
  readonly pathExists?: (absolutePath: string) => Promise<boolean>;
}

function record(value: unknown, label: string, errors: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return {};
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string, errors: string[]): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string.`);
    return '';
  }
  return value;
}

function stringArray(value: unknown, label: string, errors: string[]): readonly string[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value.map((item, index) => string(item, `${label}[${index}]`, errors));
}

function member<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  errors: string[],
): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
    return allowed[0] as T[number];
  }
  return value as T[number];
}

function unique(values: readonly string[], label: string, errors: string[]): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0)
    errors.push(`${label} contains duplicates: ${[...new Set(duplicates)].join(', ')}.`);
}

function parseEvidenceCatalog(value: unknown, errors: string[]): readonly EvidenceDefinition[] {
  if (!Array.isArray(value)) {
    errors.push('registry.evidenceCatalog must be an array.');
    return [];
  }
  const evidence = value.map((item, index): EvidenceDefinition => {
    const input = record(item, `registry.evidenceCatalog[${index}]`, errors);
    return {
      id: string(input.id, `registry.evidenceCatalog[${index}].id`, errors),
      kind: member(
        input.kind,
        evidenceKinds,
        `registry.evidenceCatalog[${index}].kind`,
        errors,
      ) as EvidenceKind,
      reference: string(input.reference, `registry.evidenceCatalog[${index}].reference`, errors),
      description: string(
        input.description,
        `registry.evidenceCatalog[${index}].description`,
        errors,
      ),
    };
  });
  unique(
    evidence.map(({ id }) => id),
    'registry.evidenceCatalog IDs',
    errors,
  );
  return evidence;
}

function parseEnforcement(
  value: unknown,
  contractId: string,
  errors: string[],
): Readonly<
  Record<
    EnforcementChannel,
    { status: EnforcementStatus; evidence: readonly string[]; reason: string }
  >
> {
  const input = record(value, `${contractId}.enforcement`, errors);
  const keys = Object.keys(input);
  for (const channel of enforcementChannels) {
    if (!Object.hasOwn(input, channel))
      errors.push(`${contractId}.enforcement is missing channel ${channel}.`);
  }
  for (const key of keys) {
    if (!enforcementChannels.includes(key as EnforcementChannel)) {
      errors.push(`${contractId}.enforcement contains unknown channel ${key}.`);
    }
  }

  return Object.fromEntries(
    enforcementChannels.map((channel) => {
      const details = record(input[channel], `${contractId}.enforcement.${channel}`, errors);
      const status = member(
        details.status,
        enforcementStatuses,
        `${contractId}.enforcement.${channel}.status`,
        errors,
      ) as EnforcementStatus;
      const evidence = stringArray(
        details.evidence,
        `${contractId}.enforcement.${channel}.evidence`,
        errors,
      );
      unique(evidence, `${contractId}.enforcement.${channel}.evidence`, errors);
      const reason = string(details.reason, `${contractId}.enforcement.${channel}.reason`, errors);
      if ((status === 'enforced' || status === 'partial') && evidence.length === 0) {
        errors.push(
          `${contractId}.enforcement.${channel} status ${status} requires concrete evidence.`,
        );
      }
      return [channel, { status, evidence, reason }];
    }),
  ) as unknown as Readonly<
    Record<
      EnforcementChannel,
      { status: EnforcementStatus; evidence: readonly string[]; reason: string }
    >
  >;
}

function parseContracts(value: unknown, errors: string[]): readonly ContractRegistryEntry[] {
  if (!Array.isArray(value)) {
    errors.push('registry.contracts must be an array.');
    return [];
  }
  return value.map((item, index): ContractRegistryEntry => {
    const input = record(item, `registry.contracts[${index}]`, errors);
    const id = string(input.id, `registry.contracts[${index}].id`, errors) as ContractId;
    const owner = record(input.owner, `${id}.owner`, errors);
    return {
      id,
      title: string(input.title, `${id}.title`, errors),
      owner: {
        kind: member(owner.kind, ownerKinds, `${id}.owner.kind`, errors) as OwnerKind,
        boundary: string(owner.boundary, `${id}.owner.boundary`, errors),
      },
      primaryPhases: stringArray(input.primaryPhases, `${id}.primaryPhases`, errors).map(
        (phase) =>
          member(phase, Object.keys(phaseDefinitions), `${id}.primaryPhases`, errors) as PhaseId,
      ),
      enforcement: parseEnforcement(input.enforcement, id, errors),
    };
  });
}

function parseRegistryShape(value: unknown): { registry: ContractRegistry; errors: string[] } {
  const errors: string[] = [];
  const input = record(value, 'registry', errors);
  if (input.schemaVersion !== 1) errors.push('registry.schemaVersion must be 1.');
  const source = record(input.canonicalSource, 'registry.canonicalSource', errors);
  if (source.title !== 'Nexus v2 Architecture Contracts') {
    errors.push('registry.canonicalSource.title must be Nexus v2 Architecture Contracts.');
  }
  if (source.version !== '1.0') errors.push('registry.canonicalSource.version must be 1.0.');
  if (source.normative !== true) errors.push('registry.canonicalSource.normative must be true.');
  const sourceReference = string(source.reference, 'registry.canonicalSource.reference', errors);

  const phaseInput = Array.isArray(input.phases) ? input.phases : [];
  if (!Array.isArray(input.phases)) errors.push('registry.phases must be an array.');
  const phases = phaseInput.map((item, index) => {
    const phase = record(item, `registry.phases[${index}]`, errors);
    return {
      id: member(
        phase.id,
        Object.keys(phaseDefinitions),
        `registry.phases[${index}].id`,
        errors,
      ) as PhaseId,
      title: string(phase.title, `registry.phases[${index}].title`, errors),
    };
  });
  unique(
    phases.map(({ id }) => id),
    'registry.phases IDs',
    errors,
  );
  for (const [id, title] of Object.entries(phaseDefinitions)) {
    const phase = phases.find((candidate) => candidate.id === id);
    if (!phase) errors.push(`registry.phases is missing ${id}.`);
    else if (phase.title !== title) errors.push(`${id} title must be "${title}".`);
  }

  const registry: ContractRegistry = {
    schemaVersion: 1,
    canonicalSource: {
      title: 'Nexus v2 Architecture Contracts',
      version: '1.0',
      reference: sourceReference,
      normative: true,
    },
    phases,
    evidenceCatalog: parseEvidenceCatalog(input.evidenceCatalog, errors),
    contracts: parseContracts(input.contracts, errors),
  };
  return { registry, errors };
}

async function defaultPathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export async function validateContractRegistry(
  value: unknown,
  context: RegistryValidationContext,
): Promise<ContractRegistry> {
  const { registry, errors } = parseRegistryShape(value);
  const expectedIds = Object.keys(canonicalContractTitles) as ContractId[];
  const ids = registry.contracts.map(({ id }) => id);
  unique(ids, 'registry.contracts IDs', errors);
  for (const id of expectedIds) {
    const contract = registry.contracts.find((entry) => entry.id === id);
    if (!contract) {
      errors.push(`registry.contracts is missing ${id}.`);
      continue;
    }
    if (contract.title !== canonicalContractTitles[id]) {
      errors.push(`${id} title must be "${canonicalContractTitles[id]}".`);
    }
    const expectedPhases = canonicalPrimaryPhases[id];
    if (JSON.stringify(contract.primaryPhases) !== JSON.stringify(expectedPhases)) {
      errors.push(`${id}.primaryPhases must match the canonical application matrix.`);
    }
  }
  for (const id of ids) {
    if (!Object.hasOwn(canonicalContractTitles, id))
      errors.push(`registry.contracts contains unknown ID ${id}.`);
  }
  if (registry.contracts.length !== expectedIds.length) {
    errors.push(`registry.contracts must contain exactly ${expectedIds.length} entries.`);
  }

  const evidenceById = new Map(registry.evidenceCatalog.map((evidence) => [evidence.id, evidence]));
  const usedEvidence = new Set<string>();
  const pathExists = context.pathExists ?? defaultPathExists;
  for (const contract of registry.contracts) {
    for (const channel of enforcementChannels) {
      const details = contract.enforcement[channel];
      for (const evidenceId of details.evidence) {
        usedEvidence.add(evidenceId);
        const evidence = evidenceById.get(evidenceId);
        if (!evidence) {
          errors.push(
            `${contract.id}.enforcement.${channel} references unknown evidence ${evidenceId}.`,
          );
          continue;
        }
        if (evidence.kind === 'path') {
          const absoluteRoot = path.resolve(context.rootDir);
          const absolutePath = path.resolve(absoluteRoot, evidence.reference);
          const relative = path.relative(absoluteRoot, absolutePath);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            errors.push(`Evidence ${evidence.id} path must remain inside the repository.`);
          } else if (!(await pathExists(absolutePath))) {
            errors.push(`Evidence ${evidence.id} path does not exist: ${evidence.reference}.`);
          }
        } else if (evidence.kind === 'command') {
          if (!context.commands.has(evidence.reference)) {
            errors.push(
              `Evidence ${evidence.id} command does not exist: pnpm ${evidence.reference}.`,
            );
          }
        } else {
          const scenarioStatus = context.evaluationStatuses.get(evidence.reference);
          if (!scenarioStatus) {
            errors.push(
              `Evidence ${evidence.id} evaluation scenario does not exist: ${evidence.reference}.`,
            );
          } else if (
            channel === 'eval' &&
            (details.status === 'enforced' || details.status === 'partial') &&
            scenarioStatus !== 'executable'
          ) {
            errors.push(
              `${contract.id}.enforcement.eval cannot claim ${details.status} from ${scenarioStatus} scenario ${evidence.reference}.`,
            );
          }
        }
      }
    }
  }
  for (const evidence of registry.evidenceCatalog) {
    if (!usedEvidence.has(evidence.id))
      errors.push(`Evidence ${evidence.id} is not referenced by any contract.`);
  }

  if (errors.length > 0) {
    throw new Error(`Architecture contract registry validation failed:\n- ${errors.join('\n- ')}`);
  }
  return {
    ...registry,
    contracts: registry.contracts.toSorted((left, right) => left.id.localeCompare(right.id)),
  };
}

export async function loadContractRegistry(rootDir: string): Promise<ContractRegistry> {
  const absoluteRoot = path.resolve(rootDir);
  const registryPath = path.join(absoluteRoot, 'docs', 'architecture', 'contracts.registry.json');
  const packageJson = JSON.parse(
    await readFile(path.join(absoluteRoot, 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };
  const registryValue: unknown = JSON.parse(await readFile(registryPath, 'utf8'));
  return validateContractRegistry(registryValue, {
    rootDir: absoluteRoot,
    commands: new Set(Object.keys(packageJson.scripts ?? {})),
    evaluationStatuses: new Map(
      evaluationCatalog.map(({ id, implementationStatus }) => [id, implementationStatus]),
    ),
  });
}
