import { afterEach, beforeEach, vi } from 'vitest';

export const blockedFetchMessage =
  'Unexpected fetch in a unit test. Stub global fetch explicitly or move controlled infrastructure behavior to an integration test.';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error(blockedFetchMessage))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
