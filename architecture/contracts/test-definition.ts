import {
  canonicalContractTitles,
  enforcementChannels,
  phaseDefinitions,
  type ContractId,
  type EnforcementChannel,
  type PhaseId,
} from './schema.ts';

export const contractTestStatuses = ['executable', 'planned', 'not_yet_executable'] as const;
export type ContractTestStatus = (typeof contractTestStatuses)[number];

export interface ContractTestEvidenceDefinition {
  readonly contractId: ContractId;
  readonly evidenceType: EnforcementChannel;
  readonly suiteId: string;
  readonly testId: string;
  readonly applicablePhase: PhaseId;
  readonly status: ContractTestStatus;
  readonly description: string;
}

export function defineContractTestEvidence(
  value: ContractTestEvidenceDefinition,
): Readonly<ContractTestEvidenceDefinition> {
  if (!Object.hasOwn(canonicalContractTitles, value.contractId)) {
    throw new Error(`Unknown Architecture Contract ${value.contractId}.`);
  }
  if (!enforcementChannels.includes(value.evidenceType)) {
    throw new Error(`Unknown contract evidence type ${value.evidenceType}.`);
  }
  if (!Object.hasOwn(phaseDefinitions, value.applicablePhase)) {
    throw new Error(`Unknown contract-test phase ${value.applicablePhase}.`);
  }
  if (!contractTestStatuses.includes(value.status)) {
    throw new Error(`Unknown contract-test status ${value.status}.`);
  }
  for (const [label, text] of [
    ['suiteId', value.suiteId],
    ['testId', value.testId],
    ['description', value.description],
  ] as const) {
    if (!/^[a-z0-9][a-z0-9.-]*$/u.test(text) && label !== 'description') {
      throw new Error(`Contract-test ${label} must be a stable lowercase identifier.`);
    }
    if (text.trim().length === 0) throw new Error(`Contract-test ${label} is required.`);
  }
  return Object.freeze({ ...value });
}
