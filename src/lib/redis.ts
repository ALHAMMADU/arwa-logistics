import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let redisAvailable = false;
let errorLogged = false;

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Stop retrying after 3 attempts to prevent noise
      if (times > 3) {
        if (!errorLogged) {
          console.warn('[Redis] Connection failed after 3 attempts. Using in-memory fallback for rate limiting.');
          errorLogged = true;
        }
        return null; // Stop retrying completely
      }
      return Math.min(times * 500, 2000);
    },
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: 2000,
    enableOfflineQueue: false,
    offlineQueue: false,
  });

  client.on('error', () => {
    // Silently ignore - handled by retry strategy
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log('[Redis] Connected successfully');
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  // Attempt connection but don't wait for it
  client.connect().catch(() => {
    // Connection failed silently - will use in-memory fallback
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

/**
 * Check if Redis is currently available and ready
 */
export function isRedisReady(): boolean {
  try {
    return redisAvailable && redis.status === 'ready';
  } catch {
    return false;
  }
}

export default redis;
