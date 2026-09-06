# ADR-0008: Terraform for infrastructure as code

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Infrastructure Architecture
- Related Architecture Contracts: AC-021, AC-023
- Related Foundation sections: 148 Security, Secrets, Deployment, Reliability,
  and Observability; 149 Agent-Legible Engineering and Codex Development Constraint
- Related implementation evidence: [Terraform guide](../../../infra/terraform/README.md),
  [separate environment roots](../../../infra/terraform/environments), and
  [separate WIF bootstrap](../../../infra/terraform/bootstrap/github-dev/README.md)

## Context

Cloud infrastructure must be reviewable, repeatable, environment-scoped, and legible
to humans and agents. Console-only configuration and general-purpose shell scripts
would make intended state, drift, IAM, and cost impact harder to review.

## Decision

Terraform manages reviewed Nexus infrastructure configuration. Development, staging,
and production use separate directory roots rather than Terraform CLI workspaces.
The GitHub WIF bootstrap is a separate root from the application environments to
avoid circular authentication ownership. Plans are reviewed before apply, and
ordinary repository verification remains credential-free.

## Alternatives considered

- Manual cloud-console configuration: rejected because it creates undocumented and
  irreproducible drift.
- Pulumi or CDK-style abstractions: viable, but unnecessary while explicit HCL is
  sufficient and already established.
- Provider CLI scripts: rejected as the primary mechanism because imperative scripts
  obscure desired state and drift.
- Terraform workspaces for environments: rejected because directory-root separation
  makes identity and state boundaries more explicit.

## Consequences

- Positive: Infrastructure changes have declarative diffs, locked providers,
  reviewable plans, and reproducible environment ownership.
- Tradeoff: Bootstrap state, provider upgrades, imports, and state migration require
  deliberate operational handling.
- Operational: Each root owns separate state; bootstrap state remains protected and
  must migrate to reviewed remote storage if it remains active.

## Constraints / guardrails

- `pnpm verify` and ordinary application tests must never run `terraform apply` or
  require GCP credentials.
- Environment roots must not share Terraform CLI workspaces or state.
- Routine console-created infrastructure drift is prohibited.
- Application roots are applied only through an explicitly reviewed deployment task.

## Revisit triggers

- Terraform or its provider model cannot safely represent required infrastructure.
- Operational evidence justifies a replacement that preserves reviewable plans,
  drift detection, environment isolation, and agent legibility.
