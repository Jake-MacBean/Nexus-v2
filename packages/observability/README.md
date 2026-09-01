# `@nexus-v2/observability`

`@nexus-v2/observability` owns Nexus technical telemetry primitives: structured
logging, telemetry identifiers, asynchronous correlation context, safe error
metadata, redaction, and OpenTelemetry-compatible trace and meter boundaries.

> Technical observability diagnoses the system. It does not become a second
> record of business truth.

> Log metadata by default, not business payloads.

## Boundary

Observability answers technical questions such as whether a request completed,
which process handled it, and which technical hop failed. It does not own or
produce:

- Business Audit or authority/accountability records;
- AI Activity or user-facing activity;
- provider/model prompts, responses, or trace payloads;
- domain events, decisions, Commands, Queries, or business state;
- analytics, browser tracking, or compliance evidence.

Correlation identifiers may later connect those systems, but a technical log is
never a substitute for their canonical records. The package imports no Nexus
business package. Architecture enforcement permits only a future narrow kernel
dependency.

## Structured log contract

The provider-neutral `NexusLogger` exposes `debug`, `info`, `warn`, and `error`.
The production sink uses Pino, while tests use the same contract with an
in-memory sink. Entries are flat JSON records with these stable core fields:

| Field            | Meaning                                                      |
| ---------------- | ------------------------------------------------------------ |
| `timestamp`      | ISO-8601 emission time                                       |
| `level`          | `debug`, `info`, `warn`, or `error`                          |
| `service`        | Controlled identity: `web`, `api`, or `worker`               |
| `environment`    | `development`, `test`, `staging`, `production`, or `unknown` |
| `event`          | Stable technical event name                                  |
| `correlation_id` | Bounded logical activity, when context exists                |
| `request_id`     | One technical request/operation hop, when context exists     |
| `trace_id`       | Real OpenTelemetry trace identifier, only when available     |
| `span_id`        | Real OpenTelemetry span identifier, only when available      |

Additional metadata must be small, allowlisted technical data such as method,
path, status code, duration, port, or operation name. Metadata cannot override
the core fields.

```ts
const logger = createLogger({ environment: 'development', service: 'worker' });

await runWithTelemetryContext(establishTelemetryContext(), async () => {
  logger.info('worker.operation.completed', {
    operation: 'technical.health_check',
  });
});
```

Do not use domain-package names as service identities. Nexus remains a modular
monolith; Cortex, Loop, Current, and other modules are not microservices.

## Request and correlation identifiers

Identifiers are opaque UUIDs with no customer, user, organization, email, or
business meaning.

- A request ID identifies one HTTP request or worker operation. Every new hop
  normally creates a new request ID.
- A correlation ID identifies one bounded logical activity. It may be preserved
  across future web, API, command, event, worker, and integration boundaries.

Inbound values are accepted only when they are canonical UUID-shaped values no
longer than 64 characters. Missing, malformed, overlong, or injection-capable
values are replaced with newly generated UUIDs. They are telemetry only and
never establish identity, authentication, authorization, or trust.

HTTP propagation uses exactly:

- `x-request-id`
- `x-correlation-id`

API and worker technical responses echo their established values. The web health
adapter creates a bounded correlation ID and a per-call request ID. It does not
create a persistent browser/session tracking identity.

`AsyncLocalStorage` preserves context through asynchronous Node work without a
global mutable current-request variable. A context is scoped to the operation
passed to `runWithTelemetryContext` and is unavailable afterward.

## OpenTelemetry boundary

`createNexusTracing` wraps the official `@opentelemetry/api`. Application code
does not acquire global tracers or use exporter APIs directly. The wrapper can
start spans and exposes a no-export meter for future technical instruments.

With no registered provider, OpenTelemetry returns non-recording spans and
no-op meters. Nexus behavior continues normally, and log entries omit trace and
span fields rather than fabricating identifiers. Tests inject an official
`BasicTracerProvider`, `SimpleSpanProcessor`, and `InMemorySpanExporter` to prove
real identifiers and completed spans without a network destination.

Future Commands, event publishers, workflow adapters, integrations, and model
adapters should accept propagated correlation metadata at their boundary, start
a Nexus span through this package, and create a new request/operation ID for the
new hop. They must not import an exporter or telemetry vendor.

No Google Cloud, collector, SaaS exporter, credential, or hosted endpoint is
configured. A future exporter attaches through OpenTelemetry provider setup at
process composition without changing business code.

## Privacy and sanitization

The logger accepts a deliberately narrow recursive `LogMetadata` value shape.
Every metadata object is sanitized before a sink sees it. Case and punctuation
variations of high-risk keys are deterministically replaced with `[REDACTED]`,
including:

- authorization, cookies, and set-cookie;
- password, secret, and credential;
- token, access token, and refresh token;
- API key, private key, and database URL.

Nested values receive the same treatment. Text removes control characters,
redacts bearer material and URL credentials, and has a bounded length. Errors
emit only name, sanitized message, and sanitized stack. Enumerable custom Error
properties are ignored.

Never log by default:

- request or response bodies;
- full HTTP headers;
- authorization material, cookies, tokens, credentials, or secret environment
  variables;
- email/message/document/file content or financial details;
- model prompts/responses, provider payloads, or arbitrary attached objects.

Prohibited patterns include `logger.info('request', request)`, serializing
`process.env`, and using technical logs as Business Audit.

## Health and readiness

Health means the process is alive. Readiness means it can currently accept its
Phase 0 technical traffic. API readiness has no invented PostgreSQL, Temporal,
AI, or Google Cloud dependency. Worker readiness follows its local lifecycle
state. Responses contain only status, service, and environment; no configuration
dumps, paths, credentials, or stack traces.

## Testing

Run `pnpm observability:test` for focused proof or `pnpm test:unit`/
`pnpm verify` for normal repository coverage. Tests prove identifier validation,
async context and isolation, logging schema, recursive redaction, safe errors,
API and worker health/readiness, web propagation, no-provider behavior, real
in-memory spans, and one shared correlation ID across separate API and worker
technical paths.

The smoke test does not claim that API calls worker. It invokes both adapters
from the test harness solely to prove the propagation contract. Tests use no
Docker, cloud account, collector, provider API, or telemetry network destination.
