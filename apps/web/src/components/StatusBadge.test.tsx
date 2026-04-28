import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders DRAFT and POSTED variants', () => {
    const { rerender } = render(<StatusBadge status="DRAFT" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('DRAFT');
    rerender(<StatusBadge status="POSTED" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('POSTED');
  });
});
