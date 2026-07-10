import { FieldSpec, PayloadSchema, EventRegistryEntry, lookupEvent } from './event-ownership';

/**
 * Raised when a producer emits an unregistered or malformed event. This is a
 * contract violation (a bug), not a user error — it is thrown INSIDE the
 * producer's transaction so the business change rolls back with it.
 */
export class EventContractViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventContractViolationError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fieldError(key: string, spec: FieldSpec, value: unknown): string | null {
  if (value === undefined || value === null) {
    return spec.optional ? null : `missing required field "${key}"`;
  }
  switch (spec.type) {
    case 'any':
      return null;
    case 'uuid':
      return typeof value === 'string' && UUID_RE.test(value) ? null : `field "${key}" must be a uuid`;
    case 'string':
      return typeof value === 'string' ? null : `field "${key}" must be a string`;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : `field "${key}" must be a number`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `field "${key}" must be a boolean`;
    case 'array':
      return Array.isArray(value) ? null : `field "${key}" must be an array`;
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) ? null : `field "${key}" must be an object`;
    default:
      return null;
  }
}

export function validatePayload(schema: PayloadSchema, payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return ['payload must be an object'];
  }
  const record = payload as Record<string, unknown>;
  const errors: string[] = [];
  for (const [key, spec] of Object.entries(schema)) {
    const err = fieldError(key, spec, record[key]);
    if (err) errors.push(err);
  }
  return errors;
}

/**
 * Resolve + validate an event against the registry. Throws
 * EventContractViolationError on an unregistered pair or a payload that does
 * not satisfy the registered schema.
 */
export function assertRegisteredAndValid(
  eventType: string,
  eventVersion: number,
  payload: unknown,
): EventRegistryEntry {
  const entry = lookupEvent(eventType, eventVersion);
  if (!entry) {
    throw new EventContractViolationError(
      `Unregistered event "${eventType}@${eventVersion}". Register it in event-ownership.ts before emitting.`,
    );
  }
  const errors = validatePayload(entry.payloadSchema, payload);
  if (errors.length > 0) {
    throw new EventContractViolationError(
      `Malformed payload for "${eventType}@${eventVersion}": ${errors.join('; ')}`,
    );
  }
  return entry;
}
