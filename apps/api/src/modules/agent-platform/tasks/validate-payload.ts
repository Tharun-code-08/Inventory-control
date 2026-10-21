import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Agent runners call services directly with an LLM-built payload, skipping the
 * REST ValidationPipe. Apply the same DTO rules here (same options as the
 * global pipe) so a draft can't create data the API would reject.
 */
export async function validateAsDto<T extends object>(dto: ClassConstructor<T>, payload: unknown): Promise<T> {
  const instance = plainToInstance(dto, payload, { enableImplicitConversion: true });
  const errors = await validate(instance, { whitelist: true, forbidUnknownValues: false });
  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? { [e.property]: `${e.property} is invalid` }));
    throw new Error(`Invalid draft: ${messages.join('; ')}`);
  }
  return instance;
}
