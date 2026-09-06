# GitHub-to-Google Cloud identity bootstrap

This root owns only the development authentication path from GitHub Actions to
Google Cloud. It is deliberately separate from `environments/dev`: GitHub cannot
use a trust path to create that same trust path, and the application environment
must not own its bootstrap identity.

## Fixed identities and trust boundary

| Item                       | Value                                                         |
| -------------------------- | ------------------------------------------------------------- |
| Google Cloud project       | `nexus-dev-507820` (`240944005221`)                           |
| GitHub repository          | `Jake-MacBean/Nexus-v2` (`1359498144`)                        |
| GitHub owner               | `Jake-MacBean` (`320386297`)                                  |
| Trusted ref                | `refs/heads/main`                                             |
| Pool ID                    | `nexus-github`                                                |
| Provider ID                | `nexus-v2`                                                    |
| Deployment service account | `nexus-dev-deployer@nexus-dev-507820.iam.gserviceaccount.com` |

GitHub's issuer is `https://token.actions.githubusercontent.com/`. The provider
uses the default audience and maps only `sub`, repository name/ID, owner name/ID,
and ref. Authentication is accepted only when the immutable repository ID is
`1359498144`, the immutable owner ID is `320386297`, and the ref is
`refs/heads/main`. The service-account IAM member is additionally scoped to the
mapped repository ID. Names remain mapped for diagnostics, not as the trust
anchor.

The workflow requests only `contents: read` and `id-token: write`. It cannot run
on pull requests, forks, pushes, or arbitrary refs. Ordinary CI remains
cloud-auth-free.

## Resources and permissions

Applying this bootstrap root creates or manages only:

- IAM, IAM Credentials, Security Token Service, Service Usage, and Cloud Resource
  Manager API enablement;
- one workload identity pool and one OIDC provider;
- one deployment service account;
- `roles/iam.workloadIdentityUser` on that service account for the
  repository-ID principal set; and
- project `roles/browser` for the deployment service account, solely for the
  read-only identity smoke.

No application deployment role is granted. The first reviewed deployment plan
must determine the exact narrow roles before P0.10-T03. There is no Owner,
Editor, service-account key, private credential, runtime-service-account reuse,
or staging/production trust. These identity/control-plane resources have no
material idle runtime cost. This root does not create Cloud Run, Cloud SQL,
Artifact Registry, Storage, Secret Manager, networking, or application state.

## One-time local bootstrap

The initial apply requires an authorized human's Google Application Default
Credentials. Install the official Google Cloud CLI, then keep authentication in
the CLI's local credential store; never copy its files or token values into this
repository.

Before any apply, verify the authenticated account and project:

```powershell
gcloud auth application-default login
gcloud config set project nexus-dev-507820
gcloud auth list --filter=status:ACTIVE
gcloud projects describe nexus-dev-507820 --format="value(projectId,projectNumber)"
```

The final command must report project ID `nexus-dev-507820` and project number
`240944005221`. Then review the plan and apply only this directory:

```powershell
terraform -chdir=infra/terraform/bootstrap/github-dev init
terraform -chdir=infra/terraform/bootstrap/github-dev plan -out=github-dev.tfplan
terraform -chdir=infra/terraform/bootstrap/github-dev show github-dev.tfplan
terraform -chdir=infra/terraform/bootstrap/github-dev apply github-dev.tfplan
terraform -chdir=infra/terraform/bootstrap/github-dev output
```

Never run `apply` in `infra/terraform/environments/dev`, `staging`, or `prod` as
part of this bootstrap. The bootstrap uses ignored local state because no remote
state bucket exists. Preserve that local state until it is migrated to a
separately reviewed, protected remote backend; do not commit, print, or manually
edit it. The configuration contains identifiers only, not credential material.

## Validation and hosted smoke

Credential-free validation is safe from the repository root:

```powershell
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/bootstrap/github-dev init -backend=false
terraform -chdir=infra/terraform/bootstrap/github-dev validate
```

After the bootstrap has propagated and the bounded commit is on `main`, manually
dispatch `.github/workflows/gcp-identity-smoke.yml` from `main`. The workflow
uses short-lived federation and service-account impersonation to confirm the
active account plus project number without mutating a resource. It has no Google
secret and uploads no credential artifact. Google IAM and workload-identity
changes can take several minutes to propagate; retry only after allowing at
least five minutes.

The negative trust proof is static: both the provider condition and workflow
guard reject a different repository ID, owner ID, or ref. Creating another
repository or weakening the trust policy solely for a hosted negative test is
not justified.

## Identity changes and recovery

A repository rename normally retains numeric identity, so keep the numeric
restriction after revalidating GitHub metadata. A repository replacement or
owner transfer can change repository or owner IDs. In that event, disable the
provider, revalidate both IDs, review and apply an explicit Terraform change,
then update the workflow guard. Never fall back to name-only or pool-wide trust.

If federation fails, confirm the workflow ran from `main`, inspect the public
provider mapping/condition and IAM binding without printing tokens, allow for
propagation, and verify the full provider resource name and service-account email.
Nexus CI/CD must not use Google Cloud service-account keys unless a future
architecture review documents an exceptional unsupported use case. WIF is the
default and current policy.
