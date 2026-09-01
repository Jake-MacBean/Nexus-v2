# Nexus secret and environment governance

> **If you are unsure whether a value is a secret, do not commit it.**

Nexus separates configuration metadata from secret payloads. This repository may describe a variable, its owner, and where a future deployment obtains it; production values, historical Nexus v1 credentials, customer credentials, tokens, private keys, and service-account material never belong in source control.

## Environment boundaries

Nexus recognizes exactly four deployment environments:

- **Local:** fake/local data, loopback infrastructure, local-only credentials, and no production secrets.
- **Test:** deterministic fixtures/fakes, no customer data or production secrets, and provider/network access disabled unless a future explicit integration suite owns it.
- **Staging:** separate data and credentials in a future dedicated Google Cloud environment, with sensitive values sourced from staging-only Secret Manager resources.
- **Production:** separate production data and credentials, least-privilege access, and sensitive values sourced from production-only Google Cloud Secret Manager resources.

Local development and normal verification require neither staging nor production access. Staging and production must never share secret resources or data stores.

## Environment registry

`environment.registry.json` is governance metadata, not runtime configuration. Every recognized variable records its owner, purpose, `server`/`client`/`tooling` visibility, `public`/`local_safe`/`secret` sensitivity, applicable and required environments, exact permitted committed examples, and production source.

`pnpm env:check` validates the registry, `.env.example`, tracked env files, Compose substitutions, and TypeScript/JavaScript references such as `process.env.NAME` and `import.meta.env.NAME`. Vite built-ins are narrowly listed as framework exemptions. Unknown Nexus variables fail.

To introduce a variable in a future packet:

1. add the registry entry with a real architectural owner and minimal environment scope;
2. classify its visibility and sensitivity;
3. add an example only when an exact public/local-safe value is justified;
4. add the source reference;
5. run `pnpm env:check`, `pnpm security:test`, and `pnpm verify`.

Anything exposed through `import.meta.env` or a `VITE_` prefix reaches the browser and is public. Client variables cannot be classified `secret`; names containing secret, password, token, private, credential, access-key, API-key, or database semantics fail. `DATABASE_URL` is server-only.

## Env files and examples

The only tracked env-style file allowed is `.env.example`. Git ignores `.env`, `.env.*`, and local variants, but the checker also inspects tracked files because ignore rules cannot protect an already committed file.

`.env.example` values must match the registry exactly. The Phase 0 PostgreSQL URL is permitted only because it targets the fixed loopback database with an explicitly local-only credential. It cannot authenticate to staging or production. Secret production variables should use empty/documentary metadata rather than realistic fake credentials.

Hard-coded secret fallbacks for environment variables are prohibited. Public or local-only defaults are permitted only when the registry approves the exact example.

## Gitleaks

Nexus pins official Gitleaks **v8.30.1**. `security/gitleaks-manifest.ts` records official release filenames, the official checksum-manifest SHA-256, archive SHA-256 values, and verified extracted-binary SHA-256 values for Windows x64 and future Linux x64/arm64 use.

The repository-owned bootstrap downloads only from the official `gitleaks/gitleaks` GitHub release. It verifies the pinned checksum file, confirms the asset checksum listed there, verifies the archive and extracted binary, and rejects any version other than 8.30.1. The binary and archive remain under ignored `.cache/gitleaks/`; executables are never committed. A fresh machine needs one network download. A provisioned cache needs neither network nor Docker.

`.gitleaks.toml` extends the built-in default rules. Nexus adds no custom secret regexes. `.gitleaksignore` contains only exact reviewed fingerprints for deterministic noncredential database-test metadata that the upstream generic API-key rule misclassifies. There are no repository-, directory-, extension-, rule-, regex-, or wildcard-wide allowlists. The secret commands and security tests reject broad policy changes.

Commands:

- `pnpm secrets:bootstrap`: provision or revalidate the exact scanner.
- `pnpm secrets:working`: copy tracked and relevant untracked files to an isolated temporary directory and scan them, excluding Git-ignored build/cache material.
- `pnpm secrets:history`: scan full Git history.
- `pnpm secrets:check`: run both secret surfaces.
- `pnpm security:check`: run environment, secret, and AC evidence validation.
- `pnpm security:test`: bootstrap if necessary and run generated synthetic leak proofs.

Every invocation uses 100% redaction. Reports live only in operating-system temporary directories and are deleted after each scan. User-visible failures contain rule, path, and historical commit metadata—not detected values. Missing or invalid provisioning fails the gate; scanning is never silently skipped.

## Production secret policy

Future production and staging secret values will be stored in separate Google Cloud Secret Manager resources. Repository configuration stores identifiers and non-secret metadata, never payloads. Later deployments should use supported Google Cloud runtime mechanisms rather than plaintext secret files. IAM access must be least-privilege and scoped independently for staging and production. This packet installs no Google Cloud SDK, IAM, Terraform, or runtime integration.

When a future task introduces a secret, it must register the variable as server/tooling-visible and secret, name Google Cloud Secret Manager as its production source, avoid a realistic committed example, and implement retrieval only in the authorized deployment packet.

## Accidental-secret response

If a probable credential is detected:

1. stop and treat it as exposed;
2. report only redacted type, repository-relative path, surface, and commit identifier when historical;
3. have the credential owner revoke or rotate it at the provider;
4. remove it from current source;
5. determine with the owner whether explicit Git-history remediation is required;
6. never assume deletion from HEAD makes it safe;
7. document the incident without recording the value.

Do not auto-rotate credentials or rewrite Git history. Do not copy historical Nexus material into fixtures. Security tests construct synthetic values only in disposable operating-system temporary directories and remove them after use.
