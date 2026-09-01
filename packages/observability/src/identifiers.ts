import { randomUUID } from 'node:crypto';

import type { TelemetryContext } from './types.js';

export const TELEMETRY_HEADERS = {
  correlationId: 'x-correlation-id',
  requestId: 'x-request-id',
} as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidTelemetryId = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 64 && uuidPattern.test(value);

export const validTelemetryIdOrUndefined = (value: unknown): string | undefined =>
  isValidTelemetryId(value) ? value.toLowerCase() : undefined;

export const generateTelemetryId = (): string => randomUUID();

export interface IncomingTelemetryIdentifiers {
  readonly correlationId?: unknown;
  readonly requestId?: unknown;
}

export const establishTelemetryContext = (
  incoming: IncomingTelemetryIdentifiers = {},
): TelemetryContext => ({
  correlationId: validTelemetryIdOrUndefined(incoming.correlationId) ?? generateTelemetryId(),
  requestId: validTelemetryIdOrUndefined(incoming.requestId) ?? generateTelemetryId(),
});
