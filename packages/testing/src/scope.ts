export type FixtureCleanup = () => void | Promise<void>;

export interface FixtureScope {
  readonly closed: boolean;
  registerCleanup(label: string, cleanup: FixtureCleanup): void;
  teardown(): Promise<void>;
}

interface RegisteredCleanup {
  readonly label: string;
  readonly cleanup: FixtureCleanup;
}

export function createFixtureScope(): FixtureScope {
  const cleanups: RegisteredCleanup[] = [];
  let closed = false;

  return {
    get closed() {
      return closed;
    },
    registerCleanup(label, cleanup) {
      if (closed) throw new Error(`Cannot register fixture cleanup "${label}" after teardown.`);
      cleanups.push({ label, cleanup });
    },
    async teardown() {
      if (closed) return;
      closed = true;
      const failures: Error[] = [];
      for (const registered of cleanups.reverse()) {
        try {
          await registered.cleanup();
        } catch (error) {
          failures.push(
            new Error(`Fixture cleanup "${registered.label}" failed.`, { cause: error }),
          );
        }
      }
      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          `${failures.length} fixture cleanup operation(s) failed.`,
        );
      }
    },
  };
}

export async function withFixtureScope<T>(body: (scope: FixtureScope) => Promise<T>): Promise<T> {
  const scope = createFixtureScope();
  let result: T | undefined;
  let bodyFailure: unknown;
  try {
    result = await body(scope);
  } catch (error) {
    bodyFailure = error;
  }

  let cleanupFailure: unknown;
  try {
    await scope.teardown();
  } catch (error) {
    cleanupFailure = error;
  }

  if (bodyFailure !== undefined && cleanupFailure !== undefined) {
    throw new AggregateError(
      [bodyFailure, cleanupFailure],
      'Fixture body and fixture cleanup both failed.',
    );
  }
  if (bodyFailure !== undefined) throw bodyFailure;
  if (cleanupFailure !== undefined) throw cleanupFailure;
  return result as T;
}
