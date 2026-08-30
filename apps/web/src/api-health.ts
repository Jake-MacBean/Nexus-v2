export interface ApiHealth {
  service: 'api';
  status: 'ok';
}

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
  return candidate.service === 'api' && candidate.status === 'ok';
};

export const getApiHealth = async (signal: AbortSignal): Promise<ApiHealth> => {
  const response = await fetch(`${apiBaseUrl}/health`, { signal });

  if (!response.ok) {
    throw new Error(`API health request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isApiHealth(payload)) {
    throw new Error('API health response did not match the smoke contract.');
  }

  return payload;
};
