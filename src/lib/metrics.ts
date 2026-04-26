interface MetricEntry {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  tags: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30_000);
  }

  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);
  }

  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  timing(name: string, startMs: number, tags: Record<string, string> = {}): void {
    const duration = Date.now() - startMs;
    this.histogram(name, duration, tags);
  }

  private buildKey(name: string, tags: Record<string, string>): string {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagStr ? `${name}{${tagStr}}` : name;
  }

  private flush(): void {
    if (this.counters.size === 0 && this.gauges.size === 0 && this.histograms.size === 0) return;

    // Log collected metrics
    const snapshot: Record<string, unknown> = {};

    for (const [key, value] of this.counters.entries()) {
      snapshot[key] = { type: 'counter', value };
    }
    for (const [key, value] of this.gauges.entries()) {
      snapshot[key] = { type: 'gauge', value };
    }
    for (const [key, values] of this.histograms.entries()) {
      const sorted = [...values].sort((a, b) => a - b);
      snapshot[key] = {
        type: 'histogram',
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    // Clear after flush
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();

    // Import logger dynamically to avoid circular deps
    import('./logger').then(({ metricsLogger }) => {
      metricsLogger.info('Metrics flush', { metrics: snapshot });
    });
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    for (const [key, value] of this.counters.entries()) snapshot[key] = value;
    for (const [key, value] of this.gauges.entries()) snapshot[key] = value;
    for (const [key, values] of this.histograms.entries()) snapshot[key] = values;
    return snapshot;
  }

  destroy(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

export const metrics = new MetricsCollector();

// Predefined metric helpers
export const apiMetrics = {
  requestStarted: (method: string, path: string) =>
    metrics.increment('api.requests.total', 1, { method, path }),
  requestCompleted: (method: string, path: string, status: number, durationMs: number) => {
    metrics.increment('api.responses.total', 1, { method, path, status: String(status) });
    metrics.histogram('api.request.duration_ms', durationMs, { method, path, status: String(status) });
  },
  requestError: (method: string, path: string, error: string) =>
    metrics.increment('api.errors.total', 1, { method, path, error }),
};

export const dbMetrics = {
  queryExecuted: (model: string, action: string, durationMs: number) =>
    metrics.histogram('db.query.duration_ms', durationMs, { model, action }),
  connectionError: (model: string) =>
    metrics.increment('db.connection.errors', 1, { model }),
};

export default metrics;
