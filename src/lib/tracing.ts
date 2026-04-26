import { randomUUID } from 'crypto';
import { apiLogger } from './logger';

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  status: 'ok' | 'error';
  attributes: Record<string, unknown>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
}

class TraceContext {
  private spans: Map<string, Span> = new Map();
  private traceId: string;

  constructor(traceId?: string) {
    this.traceId = traceId || randomUUID();
  }

  startSpan(operation: string, parentSpanId?: string, attributes?: Record<string, unknown>): string {
    const spanId = randomUUID();
    const span: Span = {
      traceId: this.traceId,
      spanId,
      parentSpanId,
      operation,
      startTime: Date.now(),
      status: 'ok',
      attributes: attributes || {},
      events: [],
    };
    this.spans.set(spanId, span);
    return spanId;
  }

  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
    }
  }

  addEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.events.push({ name, timestamp: Date.now(), attributes });
    }
  }

  setAttribute(spanId: string, key: string, value: unknown): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  getTraceId(): string {
    return this.traceId;
  }

  flush(): void {
    const completedSpans = Array.from(this.spans.values()).filter(s => s.endTime);

    if (completedSpans.length > 0) {
      apiLogger.info('Trace completed', {
        traceId: this.traceId,
        spans: completedSpans.map(s => ({
          operation: s.operation,
          durationMs: s.endTime! - s.startTime,
          status: s.status,
          attributes: s.attributes,
          events: s.events,
        })),
        totalDurationMs: Math.max(...completedSpans.map(s => s.endTime! - s.startTime)),
      });
    }

    this.spans.clear();
  }
}

// Global trace store for active traces
const activeTraces: Map<string, TraceContext> = new Map();

export function startTrace(traceId?: string): TraceContext {
  const ctx = new TraceContext(traceId);
  activeTraces.set(ctx.getTraceId(), ctx);
  return ctx;
}

export function getTrace(traceId: string): TraceContext | undefined {
  return activeTraces.get(traceId);
}

export function endTrace(traceId: string): void {
  const ctx = activeTraces.get(traceId);
  if (ctx) {
    ctx.flush();
    activeTraces.delete(traceId);
  }
}

/**
 * Helper for API route tracing - wraps a handler with tracing
 */
export function withTracing<T>(
  operation: string,
  fn: (spanId: string, traceId: string) => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const ctx = startTrace();
  const spanId = ctx.startSpan(operation, undefined, attributes);

  return fn(spanId, ctx.getTraceId())
    .then(result => {
      ctx.endSpan(spanId);
      ctx.flush();
      activeTraces.delete(ctx.getTraceId());
      return result;
    })
    .catch(error => {
      ctx.endSpan(spanId, 'error');
      ctx.setAttribute(spanId, 'error.message', error instanceof Error ? error.message : String(error));
      ctx.flush();
      activeTraces.delete(ctx.getTraceId());
      throw error;
    });
}

const tracing = { startTrace, getTrace, endTrace, withTracing };
export default tracing;
