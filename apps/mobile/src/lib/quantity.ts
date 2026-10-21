/** Parse a typed quantity ("2", " 1.5 ", "1,5"); NaN when it isn't a number. */
export function parseQuantity(text: string): number {
  const cleaned = String(text ?? '').trim().replace(',', '.');
  return cleaned === '' ? NaN : Number(cleaned);
}
