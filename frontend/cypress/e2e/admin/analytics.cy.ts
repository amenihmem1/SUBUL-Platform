describe('Admin - Analytics (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
  });

  it('loads analytics overview and renders key stats', () => {
    const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';

    cy.intercept('GET', `${apiUrl}/api/admin/analytics/overview`, {
      statusCode: 200,
      body: {
        activeUsers: 10,
        coursesCompleted: 3,
        revenue: '99',
        completionRate: 12.3,
        totalUsers: 20,
      },
    }).as('overview');

    cy.visit('/en/dashboard/admin/analytics');
    cy.wait('@overview');

    cy.get('main').should('be.visible');
    // 4 stat cards should render
    cy.get('main').find('div').contains('10').should('be.visible');
    // Revenue should render with some currency symbol or code
    cy.contains(/€|\$|USD|EUR|TND/).should('exist');
  });
});

