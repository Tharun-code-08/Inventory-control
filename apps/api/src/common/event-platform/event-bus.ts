import { Injectable, Logger } from '@nestjs/common';
import { EventEnvelope } from './event-envelope';

/**
 * A platform consumer. Consumers are independent and idempotent (they must
 * dedup on envelope.eventId). Producers never know consumers exist.
 * The Notification Engine is the first consumer; Audit/Analytics/AI attach
 * later without any producer change.
 */
export interface EventConsumer {
  readonly name: string;
  /** Return true if this consumer reacts to the given eventType. */
  handles(eventType: string): boolean;
  handle(envelope: EventEnvelope): Promise<void>;
}

/**
 * In-process event bus. The relay's publish step goes through here today; an
 * external broker (Kafka/RabbitMQ/PubSub) can replace this implementation
 * later without touching producers or consumers.
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly consumers: EventConsumer[] = [];

  register(consumer: EventConsumer): void {
    if (this.consumers.some((c) => c.name === consumer.name)) {
      this.logger.warn(`Consumer "${consumer.name}" already registered; ignoring duplicate.`);
      return;
    }
    this.consumers.push(consumer);
    this.logger.log(`Registered event consumer "${consumer.name}".`);
  }

  /**
   * Publish an envelope to every matching consumer. Awaits all of them; if any
   * throws, the error propagates to the relay, which marks the outbox row
   * FAILED and retries. Consumers must be idempotent (at-least-once).
   */
  async publish(envelope: EventEnvelope): Promise<void> {
    const targets = this.consumers.filter((c) => c.handles(envelope.eventType));
    for (const consumer of targets) {
      await consumer.handle(envelope);
    }
  }
}
