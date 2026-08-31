import {
  enforcementChannels,
  enforcementStatuses,
  type ContractRegistry,
  type EnforcementChannel,
  type EnforcementStatus,
} from './schema.ts';

export interface ContractCoverageSummary {
  readonly totalContracts: number;
  readonly channels: Readonly<
    Record<EnforcementChannel, Readonly<Record<EnforcementStatus, number>>>
  >;
  readonly reviewRequired: number;
  readonly contractsWithPlannedOrNotExecutable: number;
}

export interface ContractStatusDocument {
  readonly schemaVersion: 1;
  readonly canonicalSource: ContractRegistry['canonicalSource'];
  readonly summary: ContractCoverageSummary;
  readonly contracts: ContractRegistry['contracts'];
}

export function summarizeContractCoverage(registry: ContractRegistry): ContractCoverageSummary {
  const channels = Object.fromEntries(
    enforcementChannels.map((channel) => [
      channel,
      Object.fromEntries(
        enforcementStatuses.map((status) => [
          status,
          registry.contracts.filter((contract) => contract.enforcement[channel].status === status)
            .length,
        ]),
      ),
    ]),
  ) as unknown as ContractCoverageSummary['channels'];
  return {
    totalContracts: registry.contracts.length,
    channels,
    reviewRequired: registry.contracts.filter(
      (contract) => contract.enforcement.review.status !== 'not_applicable',
    ).length,
    contractsWithPlannedOrNotExecutable: registry.contracts.filter((contract) =>
      enforcementChannels.some((channel) =>
        ['planned', 'not_yet_executable'].includes(contract.enforcement[channel].status),
      ),
    ).length,
  };
}

export function createContractStatusDocument(registry: ContractRegistry): ContractStatusDocument {
  return {
    schemaVersion: 1,
    canonicalSource: registry.canonicalSource,
    summary: summarizeContractCoverage(registry),
    contracts: registry.contracts.toSorted((left, right) => left.id.localeCompare(right.id)),
  };
}

export function serializeContractStatus(registry: ContractRegistry): string {
  return `${JSON.stringify(createContractStatusDocument(registry), null, 2)}\n`;
}

function channelSummary(summary: ContractCoverageSummary, channel: EnforcementChannel): string {
  return enforcementStatuses
    .filter((status) => summary.channels[channel][status] > 0)
    .map((status) => `${status} ${summary.channels[channel][status]}`)
    .join(', ');
}

export function formatContractMatrix(registry: ContractRegistry): string {
  const summary = summarizeContractCoverage(registry);
  const lines = [
    'Nexus Architecture Contracts',
    `Canonical source: ${registry.canonicalSource.title} v${registry.canonicalSource.version}`,
    `Total contracts: ${summary.totalContracts}`,
    `Static: ${channelSummary(summary, 'static')}`,
    `Runtime: ${channelSummary(summary, 'runtime')}`,
    `Eval: ${channelSummary(summary, 'eval')}`,
    `Review required: ${summary.reviewRequired}`,
    `Contracts with planned/not-yet-executable channels: ${summary.contractsWithPlannedOrNotExecutable}`,
    '',
    'ID | Title | Owner | Primary phases | Static | Runtime | Eval | Review',
  ];
  for (const contract of registry.contracts) {
    lines.push(
      [
        contract.id,
        contract.title,
        `${contract.owner.kind}:${contract.owner.boundary}`,
        contract.primaryPhases.join(','),
        contract.enforcement.static.status,
        contract.enforcement.runtime.status,
        contract.enforcement.eval.status,
        contract.enforcement.review.status,
      ].join(' | '),
    );
  }
  return lines.join('\n');
}
