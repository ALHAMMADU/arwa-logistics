import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryBroker } from '../queue';
import type { QueueMessage } from '../queue';

describe('InMemoryBroker', () => {
  let broker: InMemoryBroker;

  beforeEach(() => {
    broker = new InMemoryBroker();
  });

  it('should publish and receive messages', async () => {
    const handler = vi.fn();
    await broker.subscribe('shipment.created', handler);
    await broker.publish('shipment.created', { shipmentId: '123' });

    expect(handler).toHaveBeenCalledOnce();
    const message = handler.mock.calls[0][0] as QueueMessage;
    expect(message.queue).toBe('shipment.created');
    expect(message.data).toEqual({ shipmentId: '123' });
  });

  it('should handle messages with no subscribers gracefully', async () => {
    // Should not throw
    await broker.publish('audit.log' as any, { data: 'test' });
  });

  it('should support multiple handlers for the same queue', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    await broker.subscribe('email.send', handler1);
    await broker.subscribe('email.send', handler2);
    await broker.publish('email.send', { to: 'test@test.com' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should move failed messages to dead letter queue', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Processing failed'));
    await broker.subscribe('payment.processed', failingHandler);
    await broker.publish('payment.processed', { paymentId: '456' });

    expect(failingHandler).toHaveBeenCalledOnce();
    expect(broker.getDeadLetterQueue().length).toBe(1);
  });

  it('should close and clear handlers', async () => {
    const handler = vi.fn();
    await broker.subscribe('audit.log' as any, handler);
    await broker.close();
    await broker.publish('audit.log' as any, {});
    // After close, handlers should be cleared - message should be dropped
    expect(handler).not.toHaveBeenCalled();
  });
});
