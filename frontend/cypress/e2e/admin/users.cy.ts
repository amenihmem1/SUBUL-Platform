describe('Admin - Users (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/users');
    cy.get('main').should('be.visible');
  });

  it('creates, edits, toggles status, and deletes a user', () => {
    const unique = Date.now();
    const fullName = `E2E User ${unique}`;
    const email = `e2e-user-${unique}@test.local`;

    cy.contains('button', /nouveau|new|add|create/i).click();
    cy.contains(/add user|ajouter/i).should('be.visible');

    cy.get('input[name="name"]').type(fullName);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type('TestPassword123!');
    cy.contains('button', /create|créer/i).click();

    cy.contains(email, { timeout: 20000 }).should('be.visible');

    cy.contains('tr', email).within(() => {
      cy.get('button[title="Éditer"],button[title="Edit"]').first().click();
    });
    cy.contains(/edit user|modifier/i).should('be.visible');
    cy.get('input[name="name"]').clear().type(`${fullName} Updated`);
    cy.contains('button', /save|enregistrer/i).click();
    cy.contains(`${fullName} Updated`, { timeout: 20000 }).should('be.visible');

    cy.contains('tr', email).within(() => {
      cy.get('button[title="Désactiver"],button[title="Activer"],button[title="Deactivate"],button[title="Activate"]')
        .first()
        .click();
    });
    cy.contains('tr', email).within(() => {
      cy.contains(/active|inactive/i, { timeout: 20000 }).should('be.visible');
    });

    cy.contains('tr', email).within(() => {
      cy.get('button[title="Supprimer"],button[title="Delete"]').first().click();
    });
    cy.contains(/delete user|supprimer/i).should('be.visible');
    cy.contains('button', /delete|supprimer/i).click();

    cy.contains(email).should('not.exist');
  });
});

