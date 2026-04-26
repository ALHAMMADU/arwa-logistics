type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export class Logger {
  private service: string;
  private defaultContext: Record<string, unknown>;

  constructor(service: string, defaultContext: Record<string, unknown> = {}) {
    this.service = service;
    this.defaultContext = defaultContext;
  }

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...this.defaultContext,
      ...context,
    };
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry(level, message, context);
    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.write('fatal', message, context);
  }

  child(service: string, context?: Record<string, unknown>): Logger {
    return new Logger(`${this.service}:${service}`, { ...this.defaultContext, ...context });
  }
}

// Singleton loggers for different subsystems
export const logger = new Logger('arwa-logistics');
export const apiLogger = logger.child('api');
export const dbLogger = logger.child('db');
export const authLogger = logger.child('auth');
export const redisLogger = logger.child('redis');
export const queueLogger = logger.child('queue');
export const metricsLogger = logger.child('metrics');

export default logger;
