import { queueLogger } from './logger';

export type QueueName =
  | 'shipment.created'
  | 'shipment.status_updated'
  | 'payment.processed'
  | 'notification.send'
  | 'email.send'
  | 'audit.log'
  | 'report.generate';

export interface QueueMessage<T = unknown> {
  id: string;
  queue: QueueName;
  data: T;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface MessageHandler<T = unknown> {
  (message: QueueMessage<T>): Promise<void>;
}

interface MessageBroker {
  publish<T>(queue: QueueName, data: T): Promise<void>;
  subscribe<T>(queue: QueueName, handler: MessageHandler<T>): Promise<void>;
  acknowledge(messageId: string): Promise<void>;
  reject(messageId: string, requeue?: boolean): Promise<void>;
  close(): Promise<void>;
}

/**
 * In-memory message broker implementation
 * Used when RabbitMQ/Kafka is not available
 * Messages are processed immediately (no persistence)
 */
export class InMemoryBroker implements MessageBroker {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private deadLetterQueue: QueueMessage[] = [];

  async publish<T>(queue: QueueName, data: T): Promise<void> {
    const message: QueueMessage<T> = {
      id: crypto.randomUUID(),
      queue,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    const handlers = this.handlers.get(queue) || [];

    if (handlers.length === 0) {
      queueLogger.warn('No handlers for queue, message dropped', { queue, messageId: message.id });
      return;
    }

    for (const handler of handlers) {
      try {
        await handler(message as QueueMessage);
        queueLogger.debug('Message processed', { queue, messageId: message.id });
      } catch (error) {
        queueLogger.error('Message handler failed', {
          queue,
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        });
        this.deadLetterQueue.push(message as QueueMessage);
      }
    }
  }

  async subscribe<T>(queue: QueueName, handler: MessageHandler<T>): Promise<void> {
    const handlers = this.handlers.get(queue) || [];
    handlers.push(handler as MessageHandler);
    this.handlers.set(queue, handlers);
    queueLogger.info('Subscribed to queue', { queue });
  }

  async acknowledge(_messageId: string): Promise<void> {
    // No-op for in-memory
  }

  async reject(messageId: string, requeue?: boolean): Promise<void> {
    if (requeue) {
      queueLogger.warn('Message rejected and requeued', { messageId });
    } else {
      queueLogger.warn('Message rejected to DLQ', { messageId });
    }
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }

  getDeadLetterQueue(): QueueMessage[] {
    return [...this.deadLetterQueue];
  }
}

/**
 * RabbitMQ broker implementation (placeholder for when RabbitMQ is available)
 * Will be activated when amqplib is installed and RABBITMQ_URL is set
 */
class RabbitMQBroker implements MessageBroker {
  // This will be implemented when RabbitMQ is fully integrated
  // For now, it wraps the in-memory broker

  private broker = new InMemoryBroker();

  async publish<T>(queue: QueueName, data: T): Promise<void> {
    // TODO: Implement with amqplib when ready
    // For now, delegate to in-memory
    queueLogger.info('RabbitMQ publish (falling back to in-memory)', { queue });
    return this.broker.publish(queue, data);
  }

  async subscribe<T>(queue: QueueName, handler: MessageHandler<T>): Promise<void> {
    return this.broker.subscribe(queue, handler);
  }

  async acknowledge(messageId: string): Promise<void> {
    return this.broker.acknowledge(messageId);
  }

  async reject(messageId: string, requeue?: boolean): Promise<void> {
    return this.broker.reject(messageId, requeue);
  }

  async close(): Promise<void> {
    return this.broker.close();
  }
}

// Singleton broker instance
let brokerInstance: MessageBroker | null = null;

export async function getBroker(): Promise<MessageBroker> {
  if (brokerInstance) return brokerInstance;

  const rabbitUrl = process.env.RABBITMQ_URL;

  if (rabbitUrl) {
    try {
      // Try to connect to RabbitMQ
      // Will use InMemoryBroker as fallback if connection fails
      queueLogger.info('Attempting RabbitMQ connection...', { url: rabbitUrl.replace(/\/\/.*@/, '//***@') });
      brokerInstance = new RabbitMQBroker();
    } catch (error) {
      queueLogger.warn('RabbitMQ unavailable, using in-memory broker', {
        error: error instanceof Error ? error.message : String(error),
      });
      brokerInstance = new InMemoryBroker();
    }
  } else {
    queueLogger.info('No RABBITMQ_URL set, using in-memory broker');
    brokerInstance = new InMemoryBroker();
  }

  return brokerInstance;
}

/**
 * Convenience function to publish a message
 */
export async function publishMessage<T>(queue: QueueName, data: T): Promise<void> {
  const broker = await getBroker();
  await broker.publish(queue, data);
}

/**
 * Convenience function to subscribe to a queue
 */
export async function subscribeToQueue<T>(queue: QueueName, handler: MessageHandler<T>): Promise<void> {
  const broker = await getBroker();
  await broker.subscribe(queue, handler);
}

const queueBroker = { getBroker, publishMessage, subscribeToQueue };
export default queueBroker;
