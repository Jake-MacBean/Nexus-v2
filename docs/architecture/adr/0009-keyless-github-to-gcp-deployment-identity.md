# ADR-0009: Keyless GitHub-to-GCP deployment identity

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Security Architecture
- Related Architecture Contracts: AC-021, AC-023
- Related Foundation sections: 148 Security, Secrets, Deployment, Reliability,
  and Observability - Environment Isolation and Deployment; Secrets and Credentials
- Related implementation evidence: [WIF bootstrap and runbook](../../../infra/terraform/bootstrap/github-dev/README.md),
  [Terraform configuration](../../../infra/terraform/bootstrap/github-dev/main.tf),
  [manual hosted smoke workflow](../../../.github/workflows/gcp-identity-smoke.yml),
  and [credential ignore policy](../../../.gitignore)

## Context

GitHub Actions needs a path to Google Cloud without storing a long-lived private
key. Trust must be bound to the intended immutable repository and owner identities,
the approved branch, and a dedicated identity separate from runtime services.

## Decision

GitHub Actions authenticates to Google Cloud through GitHub OIDC and Google Cloud
Workload Identity Federation, then impersonates a dedicated development deployer
service account. No service-account key or GitHub cloud credential secret exists.
Normal CI remains cloud-auth-free.

The current dev trust is fixed to:

- GCP project `nexus-dev-507820` (`240944005221`);
- repository `Jake-MacBean/Nexus-v2` with immutable ID `1359498144`;
- owner immutable ID `320386297`;
- ref `refs/heads/main`;
- pool `projects/240944005221/locations/global/workloadIdentityPools/nexus-github`;
- provider `projects/240944005221/locations/global/workloadIdentityPools/nexus-github/providers/nexus-v2`;
- service account `nexus-dev-deployer@nexus-dev-507820.iam.gserviceaccount.com`.

## Alternatives considered

- Service-account JSON keys in GitHub Secrets: rejected because they are long-lived,
  copyable credentials with rotation and exposure risk.
- A personal Google credential in CI: rejected because deployment identity must be
  non-personal, auditable, and scoped.
- Pool-wide or name-only repository trust: rejected because immutable numeric claims
  support narrower, rename-resistant authorization.
- Cloud credentials in normal CI: rejected because test-only workflows do not need
  access to Google Cloud.

## Consequences

- Positive: Authentication uses short-lived credentials with immutable repository,
  owner, and main-branch restrictions.
- Tradeoff: Federation depends on GitHub and Google OIDC compatibility, IAM
  propagation, and careful claim maintenance.
- Operational: Repository replacement or transfer requires revalidating IDs and an
  explicit trust update; each future environment requires separate review and scope.

## Constraints / guardrails

- Service-account keys are prohibited absent an exceptional future architecture
  review.
- Pull requests, forks, and arbitrary refs cannot obtain the deployer identity.
- The deployer must remain distinct from web, API, and worker runtime identities.
- Deployment-resource roles remain least-privilege and are not implied by federation.
- Never expose local ADC, access tokens, Terraform state, or generated credentials.

## Revisit triggers

- Repository replacement, ownership transfer, or immutable identity change.
- Expansion to staging or production deployment identities.
- GitHub or Google changes supported OIDC claims, federation behavior, or the
  service-account impersonation model.
