describe('University - Licenses (E2E)', () => {
  beforeEach(() => {
    cy.universityLogin();
    cy.visit('/en/dashboard/university/licenses');
    cy.get('main').should('be.visible');
  });

  it('shows licenses list (or empty state) without errors', () => {
    cy.contains('h1', /licences/i).should('be.visible');
    cy.contains(/les packs de sièges/i).should('be.visible');

    cy.get('main').then(($main) => {
      const text = $main.text();
      // Either empty state or at least one license with seat usage
      expect(/Aucune licence\./i.test(text) || /sièges utilisés/i.test(text)).to.eq(true);
    });

    // If there is a license, validate seat usage pattern "x / y sièges utilisés"
    cy.get('body').then(($b) => {
      if ($b.text().match(/sièges utilisés/i)) {
        cy.contains(/\/\s*\d+\s*sièges utilisés/i).should('exist');
      }
    });
  });
});

