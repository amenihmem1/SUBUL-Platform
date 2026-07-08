describe('Admin - Recruiters (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/recruiters');
    cy.get('main').should('be.visible');
  });

  it('creates a recruiter (employer) and shows in list', () => {
    const unique = Date.now();
    const email = `e2e-recruiter-${unique}@test.local`;
    const company = `E2E Recruiter Co ${unique}`;

    cy.get('input[placeholder="Email"]').type(email);
    cy.get('input[placeholder="Mot de passe"]').type('TestPassword123!');
    cy.get('input[placeholder="Nom"]').type(`Recruiter ${unique}`);
    cy.get('input[placeholder="Entreprise"]').type(company);
    cy.contains('button', /^créer$/i).click();

    cy.contains(email, { timeout: 20000 }).should('be.visible');
  });
});

