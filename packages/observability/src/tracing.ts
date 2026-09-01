import {
  isSpanContextValid,
  metrics,
  SpanStatusCode,
  trace,
  type Attributes,
  type Meter,
  type MeterProvider,
  type Span,
  type Tracer,
  type TracerProvider,
} from '@opentelemetry/api';

import { getTelemetryContext, runWithTelemetryContext } from './context.js';
import { sanitizeLogText } from './sanitize.js';
import type { TelemetryContext } from './types.js';

const instrumentationName = '@nexus-v2/observability';
const instrumentationVersion = '0.0.0';

export interface NexusSpan {
  readonly spanId?: string;
  readonly traceId?: string;
  end(): void;
  recordError(error: unknown): void;
}

export interface NexusTracing {
  readonly meter: Meter;
  startSpan(name: string, attributes?: Attributes): NexusSpan;
  withSpan<Result>(
    name: string,
    operation: () => Result | Promise<Result>,
    attributes?: Attributes,
  ): Promise<Result>;
}

export interface NexusTracingOptions {
  readonly meterProvider?: MeterProvider;
  readonly tracerProvider?: TracerProvider;
}

const toTelemetryContext = (context: TelemetryContext, span: NexusSpan): TelemetryContext => ({
  correlationId: context.correlationId,
  requestId: context.requestId,
  ...(span.spanId === undefined ? {} : { spanId: span.spanId }),
  ...(span.traceId === undefined ? {} : { traceId: span.traceId }),
});

const adaptSpan = (span: Span): NexusSpan => {
  const spanContext = span.spanContext();
  const validContext = isSpanContextValid(spanContext);
  return {
    ...(validContext ? { spanId: spanContext.spanId, traceId: spanContext.traceId } : {}),
    end: () => span.end(),
    recordError: (error: unknown) => {
      const message =
        error instanceof Error ? sanitizeLogText(error.message) : 'Unknown technical error';
      span.recordException(message);
      span.setStatus({ code: SpanStatusCode.ERROR, message });
    },
  };
};

export const createNexusTracing = (options: NexusTracingOptions = {}): NexusTracing => {
  const tracer: Tracer = (options.tracerProvider ?? trace.getTracerProvider()).getTracer(
    instrumentationName,
    instrumentationVersion,
  );
  const meter = (options.meterProvider ?? metrics.getMeterProvider()).getMeter(
    instrumentationName,
    instrumentationVersion,
  );

  return {
    meter,
    startSpan: (name, attributes) =>
      adaptSpan(tracer.startSpan(name, attributes === undefined ? undefined : { attributes })),
    withSpan: async <Result>(
      name: string,
      operation: () => Result | Promise<Result>,
      attributes?: Attributes,
    ): Promise<Result> => {
      const span = adaptSpan(
        tracer.startSpan(name, attributes === undefined ? undefined : { attributes }),
      );
      const context = getTelemetryContext();
      try {
        return await (context === undefined
          ? operation()
          : runWithTelemetryContext(toTelemetryContext(context, span), operation));
      } catch (error: unknown) {
        span.recordError(error);
        throw error;
      } finally {
        span.end();
      }
    },
  };
};

export const addSpanToTelemetryContext = (
  context: TelemetryContext,
  span: NexusSpan,
): TelemetryContext => toTelemetryContext(context, span);
