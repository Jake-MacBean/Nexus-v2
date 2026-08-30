# `@nexus-v2/edge`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Cross-domain organizational intelligence without duplicating canonical domain facts.

## Future responsibilities

- Future derived insights, forecasts, recommendations, decisions, outcomes, and organizational learning.
- Evidence-linked intelligence assembled from approved projections and events.

## Explicit prohibitions

- Copies of canonical facts owned by Loop, Axis, Cortex, Signal, or Current.
- Direct arbitrary imports that create domain cycles or an alternate application layer.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts; cross-domain inputs arrive through approved projections and events.
- Must never depend on: Apps, direct domain implementation internals, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/edge`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future evidence-linked organizational forecast or recommendation.
- A future record connecting a decision to its observed outcome.

## Future work that does not belong here

- A duplicate invoice, contact, opportunity, campaign, or project.
- A dashboard-only calculation with no governed intelligence boundary.
