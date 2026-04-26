import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test-service');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a logger instance', () => {
    expect(logger).toBeDefined();
  });

  it('should log info messages as JSON', () => {
    logger.info('Test message', { key: 'value' });
    expect(console.info).toHaveBeenCalled();
    const logged = JSON.parse((console.info as any).mock.calls[0][0]);
    expect(logged.level).toBe('info');
    expect(logged.message).toBe('Test message');
    expect(logged.service).toBe('test-service');
    expect(logged.key).toBe('value');
  });

  it('should log error messages', () => {
    logger.error('Error occurred', { code: 500 });
    expect(console.error).toHaveBeenCalled();
  });

  it('should create child loggers', () => {
    const child = logger.child('subsystem', { requestId: '123' });
    child.info('Child message');
    expect(console.info).toHaveBeenCalled();
    const logged = JSON.parse((console.info as any).mock.calls[0][0]);
    expect(logged.service).toBe('test-service:subsystem');
    expect(logged.requestId).toBe('123');
  });
});
