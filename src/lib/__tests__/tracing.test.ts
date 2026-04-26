import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startTrace, endTrace } from '../tracing';

describe('Tracing', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('should create a trace context', () => {
    const ctx = startTrace();
    expect(ctx).toBeDefined();
    expect(ctx.getTraceId()).toBeDefined();
    endTrace(ctx.getTraceId());
  });

  it('should create spans within a trace', () => {
    const ctx = startTrace();
    const spanId = ctx.startSpan('test-operation');
    expect(spanId).toBeDefined();
    ctx.endSpan(spanId);
    endTrace(ctx.getTraceId());
  });

  it('should add events to spans', () => {
    const ctx = startTrace();
    const spanId = ctx.startSpan('test-operation');
    ctx.addEvent(spanId, 'cache-hit', { key: 'test' });
    ctx.endSpan(spanId);
    endTrace(ctx.getTraceId());
  });

  it('should accept a custom trace ID', () => {
    const customId = 'custom-trace-123';
    const ctx = startTrace(customId);
    expect(ctx.getTraceId()).toBe(customId);
    endTrace(customId);
  });
});
