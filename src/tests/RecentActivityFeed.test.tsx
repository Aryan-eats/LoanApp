import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RecentActivityFeed from '../partner/components/RecentActivityFeed';
import { PartnerThemeProvider } from '../partner/components/PartnerThemeProvider';

describe('RecentActivityFeed', () => {
  it('renders persisted customer activity and links to the customer detail page when available', () => {
    render(
      <PartnerThemeProvider>
        <MemoryRouter>
          <RecentActivityFeed
            activityItems={[
              {
                id: 'activity-1',
                type: 'lead_created',
                title: 'Lead created',
                description: 'Captured from partner dashboard',
                timestamp: '2026-03-01T10:00:00.000Z',
                customerId: 'C-123',
              },
            ]}
          />
        </MemoryRouter>
      </PartnerThemeProvider>
    );

    expect(screen.getByText('Lead created')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/partner/customers/C-123'
    );
  });
});
