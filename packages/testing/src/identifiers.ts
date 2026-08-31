import { createHash, randomUUID } from 'node:crypto';

const fixtureNamespace = 'f17e0000-0000-5000-8000-000000000002';
const fixtureKeyPattern = /^[a-z0-9](?:[a-z0-9-]{0,62})$/u;

function namespaceBytes(): Uint8Array {
  const hex = fixtureNamespace.replaceAll('-', '');
  return Uint8Array.from(hex.match(/.{2}/gu) ?? [], (part) => Number.parseInt(part, 16));
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function assertFixtureKey(fixtureKey: string): void {
  if (!fixtureKeyPattern.test(fixtureKey)) {
    throw new Error(
      `Fixture key "${fixtureKey}" is invalid; use 1-63 lowercase letters, digits, or hyphens.`,
    );
  }
}

/** RFC 4122 version-5 UUID in Nexus's documented fixture-only namespace. */
export function deterministicFixtureId(kind: string, fixtureKey: string): string {
  assertFixtureKey(fixtureKey);
  const digest = createHash('sha1')
    .update(namespaceBytes())
    .update(new TextEncoder().encode(`${kind}:${fixtureKey}`))
    .digest();
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  return formatUuid(digest.subarray(0, 16));
}

export function uniqueFixtureToken(): string {
  return randomUUID().replaceAll('-', '').slice(0, 12);
}
