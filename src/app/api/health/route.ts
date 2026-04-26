import { NextResponse } from 'next/server';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'arwa-logistics',
    version: process.env.npm_package_version || '0.2.0',
  };

  // Check database
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    health.database = { status: 'ok', type: 'sqlite' };
  } catch (error) {
    health.database = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    health.status = 'degraded';
  }

  // Check Redis (optional - may not be configured)
  try {
    const redisModule = await import('@/lib/redis');
    const { redis } = redisModule;
    if (redis && redis.status === 'ready') {
      await redis.ping();
      health.redis = { status: 'ok' };
    } else if (redis) {
      health.redis = { status: 'connecting' };
    } else {
      health.redis = { status: 'not_configured' };
    }
  } catch {
    health.redis = { status: 'unavailable' };
    // Don't mark as degraded since Redis is optional
  }

  // Check metrics
  try {
    const { metrics } = await import('@/lib/metrics');
    health.metrics = { status: 'ok', snapshot: metrics.getSnapshot() };
  } catch {
    health.metrics = { status: 'unavailable' };
  }

  // Uptime info
  health.uptime = process.uptime();
  health.memoryUsage = {
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
