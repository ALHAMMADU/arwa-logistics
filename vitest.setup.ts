// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/arwa_test';
process.env.REDIS_URL = 'redis://localhost:6379';
// @ts-expect-error - NODE_ENV is read-only but we need to override it in tests
process.env.NODE_ENV = 'test';
