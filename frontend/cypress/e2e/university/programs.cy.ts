describe('University - Programs (E2E)', () => {
  beforeEach(() => {
    cy.universityLogin();
    cy.visit('/en/dashboard/university/programs');
    cy.get('main').should('be.visible');
  });

  it('creates a program and navigates to enrollments', () => {
    const unique = Date.now();
    const title = `E2E Program ${unique}`;

    cy.contains('h1', /programmes/i).should('be.visible');
    cy.get('input[placeholder="Titre du programme"]').type(title);
    cy.get('textarea[placeholder^="Description"]').type('E2E program description');
    cy.contains('button', /^ajouter$/i).click();

    // Success toast + list refresh
    cy.contains(/programme créé/i, { timeout: 20000 }).should('be.visible');
    cy.contains(title, { timeout: 20000 }).should('be.visible');
    cy.contains('li', title).should('contain.text', 'Actif');

    cy.contains('li', title).within(() => {
      cy.contains('a', /inscriptions/i).click();
    });

    cy.contains(/inscriptions au programme/i).should('be.visible');
    // Empty state or at least one row
    cy.contains(/aucun apprenant inscrit|utilisateur/i).should('exist');
  });
});

