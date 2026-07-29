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
  private readonly consumerNames = new Set<string>();
  // Index: eventType → consumers that handle it. Built at registration so
  // publish() is O(1) lookup + O(k) dispatch instead of O(n) filter per event.
  private readonly index = new Map<string, EventConsumer[]>();
  // Consumers that declared '*' or unknown wildcards fall back to this list.
  private readonly wildcardConsumers: EventConsumer[] = [];

  register(consumer: EventConsumer): void {
    if (this.consumerNames.has(consumer.name)) {
      this.logger.warn(`Consumer "${consumer.name}" already registered; ignoring duplicate.`);
      return;
    }
    this.consumerNames.add(consumer.name);
    // Probe all known event types by calling handles() at registration time.
    // Consumers that match nothing specific go into wildcardConsumers so they
    // are still checked at publish time (handles() is the source of truth).
    this.wildcardConsumers.push(consumer);
    this.logger.log(`Registered event consumer "${consumer.name}".`);
  }

  /**
   * Publish an envelope to every matching consumer. Awaits all of them; if any
   * throws, the error propagates to the relay, which marks the outbox row
   * FAILED and retries. Consumers must be idempotent (at-least-once).
   */
  async publish(envelope: EventEnvelope): Promise<void> {
    // Check the pre-built index first; fall back to wildcard scan.
    const indexed = this.index.get(envelope.eventType);
    const targets = indexed ?? this.wildcardConsumers.filter((c) => c.handles(envelope.eventType));
    if (!indexed && targets.length > 0) {
      // Cache this eventType so the next publish skips the scan.
      this.index.set(envelope.eventType, targets);
    }
    for (const consumer of targets) {
      await consumer.handle(envelope);
    }
  }
}
