describe('Admin - Settings currency propagation (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
  });

  it('sets currency to USD and verifies Admin pages show $ (not €)', () => {
    const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';

    // Stub data so pages render amounts
    cy.intercept('GET', `${apiUrl}/api/admin/transactions/stats`, {
      statusCode: 200,
      body: {
        revenueByCurrency: [{ currency: 'USD', revenueCents: 10000, paidCount: 1 }],
        paidCount: 1,
        failedCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
        expiredCount: 0,
        refundedCount: 0,
        initiatedCount: 0,
        stripePaidByCurrency: [{ currency: 'USD', revenueCents: 10000 }],
        flouciPaidByCurrency: [],
        standardPaidCount: 1,
        premiumPaidCount: 0,
        freePaidCount: 0,
        totalTransactions: 1,
      },
    });
    cy.intercept('GET', `${apiUrl}/api/admin/transactions?*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            provider: 'stripe',
            providerReference: 'pi_test',
            userId: 1,
            userEmail: 'e2e.user@test.local',
            userName: 'E2E User',
            customerEmail: null,
            amountCents: 4200,
            currency: 'usd',
            originalAmountCents: 4200,
            discountCents: 0,
            status: 'paid',
            billingCycle: 'monthly',
            planSlug: 'standard',
            planDisplayLabel: 'Standard',
            planCategory: 'standard',
            createdAt: new Date().toISOString(),
            paidAt: new Date().toISOString(),
            metadataPreview: null,
            subscriptionId: null,
            promoCode: null,
            countryCode: 'US',
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
      },
    });
    cy.intercept('GET', `${apiUrl}/api/admin/transactions/analytics?*`, {
      statusCode: 200,
      body: {
        granularity: 'day',
        series: [],
        statusDistribution: [{ status: 'paid', count: 1 }],
        revenueByProvider: [{ provider: 'stripe', revenueCents: 10000, count: 1 }],
        note: 'stub',
      },
    });
    cy.intercept('GET', `${apiUrl}/api/admin/analytics/overview`, {
      statusCode: 200,
      body: { activeUsers: 1, coursesCompleted: 1, revenue: '99', completionRate: 10, totalUsers: 1 },
    });

    cy.visit('/en/dashboard/admin/settings');
    cy.contains('button', /payment/i).click({ force: true });
    cy.contains(/currency/i).should('be.visible');
    cy.get('select').contains('option', /USD/i).then(($opt) => {
      cy.get('select').select($opt.attr('value') as string);
    });
    cy.contains('button', /save/i).click();
    cy.contains(/save changes/i).should('be.visible');
    cy.contains('button', /^save$/i).click();
    cy.contains(/saved/i).should('be.visible');

    cy.visit('/en/dashboard/admin/payments');
    cy.contains('$').should('exist');
    cy.contains('€').should('not.exist');

    cy.visit('/en/dashboard/admin/analytics');
    cy.contains('$').should('exist');
    cy.contains('€').should('not.exist');

    cy.visit('/en/dashboard/admin/universities');
    cy.get('main').should('be.visible');
    cy.contains('€').should('not.exist');
  });
});

