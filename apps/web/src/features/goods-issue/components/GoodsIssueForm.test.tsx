import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GoodsIssueForm } from './GoodsIssueForm';

describe('GoodsIssueForm', () => {
  it('shows inline error and disables submit when qty > available', async () => {
    const user = userEvent.setup();
    render(<GoodsIssueForm shopId="00000000-0000-0000-0000-000000000001" available={5} />);
    await user.clear(screen.getByTestId('qty-input'));
    await user.type(screen.getByTestId('qty-input'), '10');
    expect(screen.getByTestId('qty-error')).toHaveTextContent('Quantity exceeds available stock');
    expect(screen.getByTestId('submit-gi')).toBeDisabled();
  });
});
