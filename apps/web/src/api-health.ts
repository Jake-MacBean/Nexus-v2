export interface ApiHealth {
  environment: string;
  service: 'api';
  status: 'ok';
}

export const API_TELEMETRY_HEADERS = {
  correlationId: 'x-correlation-id',
  requestId: 'x-request-id',
} as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultApiBaseUrl = 'http://127.0.0.1:3000';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl).replace(
  /\/$/,
  '',
);

const isApiHealth = (value: unknown): value is ApiHealth => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.environment === 'string' &&
    candidate.environment.length > 0 &&
    candidate.service === 'api' &&
    candidate.status === 'ok'
  );
};

export const createApiTelemetryHeaders = (
  suppliedCorrelationId?: string,
): Readonly<Record<string, string>> => ({
  [API_TELEMETRY_HEADERS.correlationId]:
    suppliedCorrelationId !== undefined && uuidPattern.test(suppliedCorrelationId)
      ? suppliedCorrelationId.toLowerCase()
      : crypto.randomUUID(),
  [API_TELEMETRY_HEADERS.requestId]: crypto.randomUUID(),
});

export const getApiHealth = async (
  signal: AbortSignal,
  correlationId?: string,
): Promise<ApiHealth> => {
  const response = await fetch(`${apiBaseUrl}/health`, {
    headers: createApiTelemetryHeaders(correlationId),
    signal,
  });

  if (!response.ok) {
    throw new Error(`API health request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isApiHealth(payload)) {
    throw new Error('API health response did not match the smoke contract.');
  }

  return payload;
};
