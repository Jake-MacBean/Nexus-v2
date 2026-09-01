import type { LogMetadata, LogValue } from './types.js';

export const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const CIRCULAR = '[CIRCULAR]';
const maximumDepth = 8;
const maximumStringLength = 4_096;

const sensitiveKeyFragments = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  'apikey',
  'databaseurl',
  'credential',
  'privatekey',
] as const;

const canonicalKey = (key: string): string => key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');

export const isSensitiveLogKey = (key: string): boolean => {
  const canonical = canonicalKey(key);
  return sensitiveKeyFragments.some((fragment) => canonical.includes(fragment));
};

export const sanitizeLogText = (value: string): string => {
  const withoutControls = value.replaceAll(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  const withoutBearerTokens = withoutControls.replaceAll(
    /\bBearer\s+[^\s,;]+/gi,
    `Bearer ${REDACTED}`,
  );
  const withoutUrlCredentials = withoutBearerTokens.replaceAll(
    /\b(postgres(?:ql)?|https?):\/\/[^\s/@]+(?::[^\s/@]*)?@/gi,
    '$1://[REDACTED]@',
  );
  return withoutUrlCredentials.length <= maximumStringLength
    ? withoutUrlCredentials
    : `${withoutUrlCredentials.slice(0, maximumStringLength)}${TRUNCATED}`;
};

const sanitizeValue = (value: LogValue, depth: number, seen: WeakSet<object>): LogValue => {
  if (typeof value === 'string') {
    return sanitizeLogText(value);
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (depth >= maximumDepth) {
    return TRUNCATED;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return CIRCULAR;
    }
    seen.add(value);
  }
  if (Array.isArray(value)) {
    const result = value.map((item) => sanitizeValue(item, depth + 1, seen));
    seen.delete(value);
    return result;
  }

  const result: Record<string, LogValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = isSensitiveLogKey(key) ? REDACTED : sanitizeValue(nestedValue, depth + 1, seen);
  }
  seen.delete(value);
  return result;
};

export const sanitizeLogMetadata = (metadata: LogMetadata = {}): LogMetadata => {
  const result: Record<string, LogValue> = {};
  const seen = new WeakSet<object>();
  for (const [key, value] of Object.entries(metadata)) {
    result[key] = isSensitiveLogKey(key) ? REDACTED : sanitizeValue(value, 0, seen);
  }
  return result;
};

export const safeErrorMetadata = (error: unknown): LogMetadata => {
  if (!(error instanceof Error)) {
    return { error: { message: 'Unknown technical error', name: 'UnknownError' } };
  }

  const safeError: Record<string, LogValue> = {
    message: sanitizeLogText(error.message),
    name: sanitizeLogText(error.name),
  };
  if (error.stack !== undefined) {
    safeError.stack = sanitizeLogText(error.stack);
  }
  return { error: safeError };
};
