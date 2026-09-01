export type NexusService = 'web' | 'api' | 'worker';

export type RuntimeEnvironment = 'development' | 'test' | 'staging' | 'production' | 'unknown';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogPrimitive = boolean | null | number | string;

export type LogValue = LogPrimitive | readonly LogValue[] | { readonly [key: string]: LogValue };

export type LogMetadata = Readonly<Record<string, LogValue>>;

export interface TelemetryContext {
  readonly correlationId: string;
  readonly requestId: string;
  readonly spanId?: string;
  readonly traceId?: string;
}

export interface StructuredLogEntry extends Readonly<Record<string, LogValue>> {
  readonly correlation_id?: string;
  readonly environment: RuntimeEnvironment;
  readonly event: string;
  readonly level: LogLevel;
  readonly request_id?: string;
  readonly service: NexusService;
  readonly span_id?: string;
  readonly timestamp: string;
  readonly trace_id?: string;
}

export interface LogSink {
  write(entry: StructuredLogEntry): void;
}

export interface NexusLogger {
  debug(event: string, metadata?: LogMetadata): void;
  error(event: string, metadata?: LogMetadata): void;
  info(event: string, metadata?: LogMetadata): void;
  warn(event: string, metadata?: LogMetadata): void;
}

export const resolveRuntimeEnvironment = (value: string | undefined): RuntimeEnvironment => {
  switch (value) {
    case 'development':
    case 'test':
    case 'staging':
    case 'production':
      return value;
    default:
      return 'unknown';
  }
};
