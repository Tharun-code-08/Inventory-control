import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formResolver } from './form-resolver';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    qty: z.coerce.number().positive('Qty must be > 0'),
    tax: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
    kind: z.enum(['A', 'B']).default('A'),
  })
  .superRefine((v, ctx) => {
    if (v.name === 'bad') ctx.addIssue({ code: 'custom', message: 'Bad name', path: ['name'] });
  });

type Values = z.infer<typeof schema>;
const run = (values: unknown) =>
  formResolver<Values>(schema)(values as Values, undefined, { fields: {}, shouldUseNativeValidation: false } as never);

describe('formResolver (zod 4)', () => {
  it('coerces typed text into numbers and applies defaults', async () => {
    const result = await run({ name: 'x', qty: '3', tax: '18' });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: 'x', qty: 3, tax: 18, kind: 'A' });
  });

  it('reports field messages, including refinements', async () => {
    const result = await run({ name: 'bad', qty: '0' });
    expect((result.errors as Record<string, { message: string }>).qty.message).toBe('Qty must be > 0');
    expect((result.errors as Record<string, { message: string }>).name.message).toBe('Bad name');
  });
});
