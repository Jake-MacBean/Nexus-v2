import { expect, test } from 'vitest';

test('unexpected unit-test fetch calls are blocked by default', async () => {
  await expect(fetch('https://provider.example.test')).rejects.toThrow(
    /Unexpected fetch in a unit test/u,
  );
});
