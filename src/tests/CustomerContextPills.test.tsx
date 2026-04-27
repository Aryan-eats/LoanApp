import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CustomerContextPills from '../partner/components/CustomerContextPills';
import { PartnerThemeProvider } from '../partner/components/PartnerThemeProvider';

describe('CustomerContextPills', () => {
  it('renders customer metadata and a customer detail link when a customer id is present', () => {
    render(
      <PartnerThemeProvider>
        <MemoryRouter>
          <CustomerContextPills
            customerId="C-123"
            customerKey="CRM-123"
            leadSource="partner"
            leadScore={87}
            scoreBand="high"
          />
        </MemoryRouter>
      </PartnerThemeProvider>
    );

    expect(screen.getByText('CRM-123')).toBeInTheDocument();
    expect(screen.getByText(/Source: Partner/i)).toBeInTheDocument();
    expect(screen.getByText('Score: 87/100')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view customer/i })).toHaveAttribute(
      'href',
      '/partner/customers/C-123'
    );
  });
});
