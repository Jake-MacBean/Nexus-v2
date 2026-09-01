import pino, { type DestinationStream } from 'pino';

import { getTelemetryContext } from './context.js';
import { sanitizeLogMetadata, sanitizeLogText } from './sanitize.js';
import type {
  LogLevel,
  LogMetadata,
  LogSink,
  NexusLogger,
  NexusService,
  RuntimeEnvironment,
  StructuredLogEntry,
} from './types.js';

export interface LoggerOptions {
  readonly clock?: () => Date;
  readonly environment: RuntimeEnvironment;
  readonly service: NexusService;
  readonly sink?: LogSink;
}

export interface PinoLogSinkOptions {
  readonly destination?: DestinationStream;
  readonly minimumLevel?: LogLevel;
}

export interface InMemoryLogSink extends LogSink {
  readonly entries: readonly StructuredLogEntry[];
  clear(): void;
}

export const createPinoLogSink = (options: PinoLogSinkOptions = {}): LogSink => {
  const logger = pino(
    {
      base: null,
      formatters: { level: (label) => ({ level: label }) },
      level: options.minimumLevel ?? 'info',
      timestamp: false,
    },
    options.destination,
  );

  return {
    write: (entry) => {
      const { level, ...fields } = entry;
      logger[level](fields);
    },
  };
};

export const createInMemoryLogSink = (): InMemoryLogSink => {
  const captured: StructuredLogEntry[] = [];
  return {
    clear: () => captured.splice(0),
    get entries() {
      return captured.map((entry) => ({ ...entry }));
    },
    write: (entry) => captured.push({ ...entry }),
  };
};

export const createLogger = ({
  clock = () => new Date(),
  environment,
  service,
  sink = createPinoLogSink(),
}: LoggerOptions): NexusLogger => {
  const write = (level: LogLevel, event: string, metadata: LogMetadata = {}): void => {
    const context = getTelemetryContext();
    const safeMetadata = sanitizeLogMetadata(metadata);
    const entry: StructuredLogEntry = {
      ...safeMetadata,
      environment,
      event: sanitizeLogText(event),
      level,
      service,
      timestamp: clock().toISOString(),
      ...(context === undefined
        ? {}
        : {
            correlation_id: context.correlationId,
            request_id: context.requestId,
            ...(context.spanId === undefined ? {} : { span_id: context.spanId }),
            ...(context.traceId === undefined ? {} : { trace_id: context.traceId }),
          }),
    };
    sink.write(entry);
  };

  return {
    debug: (event, metadata) => write('debug', event, metadata),
    error: (event, metadata) => write('error', event, metadata),
    info: (event, metadata) => write('info', event, metadata),
    warn: (event, metadata) => write('warn', event, metadata),
  };
};
