import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('supports asChild with a single child element', () => {
    render(
      <Button asChild variant="outline">
        <a href="/sales">Back to Sales Orders</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Back to Sales Orders' })).toBeInTheDocument();
  });
});
