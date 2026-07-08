describe('University - Invites (E2E)', () => {
  beforeEach(() => {
    cy.universityLogin();
    cy.visit('/en/dashboard/university/invites');
    cy.get('main').should('be.visible');
  });

  it('creates invites and shows registration links block', () => {
    const unique = Date.now();
    const email1 = `e2e-invite-${unique}-1@test.local`;
    const email2 = `e2e-invite-${unique}-2@test.local`;

    cy.contains('h1', /invitations apprenants/i).should('be.visible');
    cy.get('textarea[placeholder^="email1"]').type(`${email1}\n${email2}`);
    cy.contains('button', /créer les invitations/i).click();

    // After creation, a block "Liens d’inscription" should appear
    cy.contains(/liens d’inscription/i, { timeout: 20000 }).should('be.visible');
    cy.contains(email1).should('be.visible');
    cy.contains(email2).should('be.visible');

    // Links should point to /auth/register?invite=
    cy.contains(email1)
      .parents('li')
      .within(() => {
        cy.get('code').invoke('text').should('match', /\/auth\/register\?invite=/);
        cy.contains('button', /copier/i).click();
        cy.contains(/copié/i).should('be.visible');
      });

    // Recent invites list should include created emails
    cy.contains(/invitations récentes/i).should('be.visible');
    cy.contains(email1, { timeout: 20000 }).should('be.visible');
    cy.contains(email2, { timeout: 20000 }).should('be.visible');
  });
});

