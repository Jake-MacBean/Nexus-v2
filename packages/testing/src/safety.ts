const reservedDomainPattern = /(?:^|\.)(?:example\.com|example\.test|example|test|invalid)$/u;
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9_]{20,}/u,
  /sk-[A-Za-z0-9_-]{20,}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

export function assertReservedFixtureDomain(domain: string): void {
  if (!reservedDomainPattern.test(domain.toLowerCase())) {
    throw new Error(`Fixture domain "${domain}" is unsafe; use a reserved example/test domain.`);
  }
}

export function assertSafeFixtureStrings(values: Readonly<Record<string, string>>): void {
  for (const [field, value] of Object.entries(values)) {
    if (secretPatterns.some((pattern) => pattern.test(value))) {
      throw new Error(`Fixture field "${field}" contains a secret-shaped value.`);
    }
  }
}
