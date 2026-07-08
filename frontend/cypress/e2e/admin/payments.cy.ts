describe('Admin - Payments (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
  });

  it('lists transactions, opens details modal, and triggers refund', () => {
    const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';

    cy.intercept('GET', `${apiUrl}/api/admin/transactions/stats`, {
      statusCode: 200,
      body: {
        monthlyRevenue: '1234',
        transactionsCount: 1,
        pendingAmount: 0,
        refundsAmount: 0,
      },
    }).as('getTxnStats');

    cy.intercept('GET', `${apiUrl}/api/admin/transactions*`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          externalId: 'txn_123',
          user: 'E2E User',
          email: 'e2e.user@test.local',
          type: 'payment',
          amount: 42,
          method: 'card',
          status: 'completed',
          description: 'E2E transaction',
          createdAt: new Date().toISOString(),
        },
      ],
    }).as('getTxns');

    cy.intercept('POST', `${apiUrl}/api/admin/transactions/1/refund`, {
      statusCode: 200,
      body: {
        id: 1,
        externalId: 'txn_123',
        user: 'E2E User',
        email: 'e2e.user@test.local',
        type: 'refund',
        amount: -42,
        method: 'card',
        status: 'refunded',
        description: 'Refunded',
        createdAt: new Date().toISOString(),
      },
    }).as('refund');

    cy.visit('/en/dashboard/admin/payments');
    cy.wait(['@getTxnStats', '@getTxns']);

    cy.contains('txn_123').should('be.visible');
    cy.get('button[title="View details"]').click();
    cy.contains(/transaction details/i).should('be.visible');
    cy.contains(/e2e transaction/i).should('be.visible');

    // Refund button appears only if refundable and status completed
    cy.get('button[title="Refund"]').click();
    cy.contains(/refund/i).should('be.visible');
    cy.contains('button', /confirm|refund/i).click({ force: true });
    cy.wait('@refund');
  });
});

