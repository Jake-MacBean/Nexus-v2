import { AsyncLocalStorage } from 'node:async_hooks';

import type { TelemetryContext } from './types.js';

const telemetryStorage = new AsyncLocalStorage<TelemetryContext>();

export const getTelemetryContext = (): TelemetryContext | undefined => telemetryStorage.getStore();

export const runWithTelemetryContext = <Result>(
  context: TelemetryContext,
  operation: () => Result,
): Result => telemetryStorage.run(context, operation);
