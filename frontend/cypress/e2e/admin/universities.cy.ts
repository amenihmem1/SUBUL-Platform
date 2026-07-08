describe('Admin - Universities (E2E)', () => {
  beforeEach(() => {
    cy.adminLogin();
  });

  it('creates a university and assigns a license + staff account', () => {
    const unique = Date.now();
    const uniName = `E2E University ${unique}`;

    cy.visit('/en/dashboard/admin/universities');
    cy.get('main').should('be.visible');

    cy.get('input[placeholder="Nom université"]').type(uniName);
    cy.contains('button', /^créer$/i).click();
    cy.contains(uniName, { timeout: 20000 }).should('be.visible');

    cy.contains('li', uniName).within(() => {
      cy.contains('button', /gérer/i).click();
    });

    cy.get('select').first().contains('option', /premium|standard/i).then(($opt) => {
      const val = $opt.attr('value');
      expect(val).to.be.a('string').and.not.be.empty;
      cy.get('select').first().select(val as string);
    });
    cy.get('input[placeholder="Sièges"]').clear().type('10');
    cy.contains('button', /attribuer licence/i).click();

    const staffEmail = `e2e-staff-${unique}@test.local`;
    cy.get('input[placeholder="Email staff"]').type(staffEmail);
    cy.get('input[placeholder="Mot de passe"]').type('TestPassword123!');
    cy.contains('button', /créer staff/i).click();
    cy.contains(/compte staff créé/i, { timeout: 20000 }).should('be.visible');
  });
});

