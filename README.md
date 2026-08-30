# Nexus v2

Nexus v2 is being built as a clean, TypeScript-first platform. This repository currently contains only the Phase 0 Engineering Harness. Substantive Nexus business features are intentionally out of scope.

## Current work packet

`P0.01-T01 - Initialize repository and runtime pins`

The root toolchain is pinned and provides a strict TypeScript baseline, deterministic dependency installation, formatting conventions, and a single verification entry point. Package and application ownership boundaries will be scaffolded by later Phase 0 work packets.

## Prerequisites

- Node.js 24.20.0 LTS
- Corepack enabled
- pnpm 11.24.0, selected through the `packageManager` field

Use the pinned Node version from `.nvmrc` or `.node-version`. Do not use npm, Yarn, or an unpinned pnpm release for repository operations.

## Bootstrap

```shell
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm verify
```

For the initial checkout, before a lockfile exists, use `pnpm install`. The committed lockfile is authoritative afterward.

## Root commands

| Command                   | Purpose                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm build`              | Build/type-check the currently scaffolded TypeScript project graph.                    |
| `pnpm typecheck`          | Run the strict TypeScript compiler without emitting files.                             |
| `pnpm lint`               | Run the lint gate. The implementation is intentionally deferred in T01.                |
| `pnpm test`               | Run the test gate. The implementation is intentionally deferred in T01.                |
| `pnpm architecture:check` | Run architecture-contract checks. The implementation is intentionally deferred in T01. |
| `pnpm format:check`       | Verify formatting with Prettier.                                                       |
| `pnpm verify`             | Run every current Phase 0 gate in dependency order.                                    |

Placeholder gates print an explicit message and succeed only because their implementations belong to later bounded Phase 0 work packets. They must be replaced rather than bypassed when those packets are executed.

## Environment configuration

Copy `.env.example` to a local `.env` only when a later work packet requires runtime configuration. The example contains names and non-secret local values only. Never commit `.env`, credentials, production identifiers, customer data, or secret-looking placeholders.

## Controlling sources

Implementation must remain consistent with:

1. Nexus v2 Foundation v1.0
2. Nexus v2 Build Plan v1.0
3. Nexus v2 Architecture Contracts v1.0
4. Nexus v2 Phase 0 Codex Execution Package v1.0

If code evidence conflicts with a controlling decision, stop and record the conflict in an ADR before changing the architecture.
