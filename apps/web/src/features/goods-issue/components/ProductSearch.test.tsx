import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSearch } from './ProductSearch';
import { api } from '@/api/client';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}));

describe('ProductSearch', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('debounces and shows dropdown', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [{ id: '1', productCode: 'ABC', description: 'Item', uom: 'UNIT' }], meta: {} },
    } as never);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ProductSearch shopId="shop" onSelect={onSelect} />);
    await user.type(screen.getByTestId('product-search-input'), 'AB');
    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalled();
      },
      { timeout: 800 },
    );
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());
    await user.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalled();
  });
});
