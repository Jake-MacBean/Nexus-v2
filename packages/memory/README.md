# `@nexus-v2/memory`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Structured and episodic memory infrastructure plus permission-aware retrieval boundaries.

## Future responsibilities

- Future memory candidate, retrieval, ranking, provenance, confidence, and lifecycle contracts.
- Infrastructure that retrieves relevant memory without replacing canonical records.

## Explicit prohibitions

- Canonical business truth, unpermissioned retrieval, or a generic document store.
- Domain object duplication presented as memory.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and observability.
- Must never depend on: Apps, domain implementations, direct application mutation, AI provider SDKs, or database policy.
- Consumers must import through `@nexus-v2/memory`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future episodic-memory retrieval port with provenance and confidence.
- A future memory-candidate lifecycle contract.

## Future work that does not belong here

- The authoritative status of an invoice or project.
- A model conversation used as the only durable business record.
