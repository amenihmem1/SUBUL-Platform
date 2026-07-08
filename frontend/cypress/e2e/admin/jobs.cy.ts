describe('Admin - Jobs moderation (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
  });

  it('accepts a pending job (UI -> PATCH status)', () => {
    const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';

    cy.intercept('GET', `${apiUrl}/api/admin/jobs*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'job-e2e-1',
            title: 'DevOps Engineer',
            description: 'E2E pending job',
            location: 'Remote',
            contractType: 'full-time',
            salary: 90000,
            skills: ['AWS', 'Docker'],
            status: 'pending',
            company: { id: 'c1', name: 'E2E Corp' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    }).as('getJobs');

    cy.intercept('PATCH', `${apiUrl}/api/admin/jobs/job-e2e-1/status`, {
      statusCode: 200,
      body: { job: { id: 'job-e2e-1' }, message: 'updated' },
    }).as('patchJob');

    cy.visit('/en/dashboard/admin/jobs');
    cy.wait('@getJobs');
    cy.contains('DevOps Engineer').should('be.visible');

    cy.contains('DevOps Engineer')
      .closest('div')
      .within(() => {
        cy.get('button[title="Accepter"],button[title="Accept"]').click();
      });

    cy.wait('@patchJob')
      .its('request.body')
      .should('deep.include', { status: 'published' });
  });
});

