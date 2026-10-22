import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * zodResolver typed by the form's (parsed) values. With zod 4 a schema's input
 * and output types differ (z.coerce.number() takes `unknown`), which no longer
 * lines up with useForm<Values>; validation and coercion are unchanged.
 */
export function formResolver<TValues extends FieldValues>(schema: z.ZodType<TValues, any>): Resolver<TValues> {
  return zodResolver(schema as never) as unknown as Resolver<TValues>;
}
