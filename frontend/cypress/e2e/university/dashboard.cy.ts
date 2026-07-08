describe('University Dashboard', () => {
  beforeEach(() => {
    cy.universityLogin();
    cy.visit('/en/dashboard/university');
  });

  it('should display the university dashboard', () => {
    cy.get('main').should('be.visible');
    cy.contains('h1', /espace université/i).should('be.visible');
    cy.contains(/programmes, licences et invitations/i).should('be.visible');

    // Summary cards
    cy.contains('Programmes').should('be.visible');
    cy.contains('Inscriptions').should('be.visible');
    cy.contains('Staff').should('be.visible');
    cy.contains(/Invitations en attente/i).should('be.visible');

    // Card values should be numbers
    const assertCardNumber = (label: RegExp) => {
      cy.contains('p', label)
        .parents('div.rounded-xl')
        .first()
        .within(() => {
          cy.get('p').last().invoke('text').should('match', /^\d+$/);
        });
    };
    assertCardNumber(/^Programmes$/);
    assertCardNumber(/^Inscriptions$/);
    assertCardNumber(/^Staff$/);
  });

  describe('Programs Page', () => {
    beforeEach(() => {
      cy.universityLogin();
      cy.visit('/en/dashboard/university/programs');
    });

    it('should display programs page', () => {
      cy.get('main').should('be.visible');
      cy.contains('h1', /programmes/i).should('be.visible');
      cy.get('input[placeholder="Titre du programme"]').should('be.visible');
      cy.contains('button', /^ajouter$/i).should('be.visible');
    });

    it('should have create new program button', () => {
      cy.contains(/ajouter/i).should('exist');
    });
  });

  describe('Program Enrollments Page', () => {
    it('should display program enrollments', () => {
      cy.universityLogin();
      cy.visit('/en/dashboard/university/programs/1/enrollments');
      cy.get('main').should('be.visible');
      cy.contains(/inscriptions au programme/i).should('be.visible');
    });
  });

  describe('Licenses Page', () => {
    beforeEach(() => {
      cy.universityLogin();
      cy.visit('/en/dashboard/university/licenses');
    });

    it('should display licenses page', () => {
      cy.get('main').should('be.visible');
      cy.contains('h1', /licences/i).should('be.visible');
      // either empty or contains one usage row
      cy.contains(/aucune licence|sièges utilisés/i).should('exist');
    });
  });

  describe('Invites Page', () => {
    beforeEach(() => {
      cy.universityLogin();
      cy.visit('/en/dashboard/university/invites');
    });

    it('should display invites page', () => {
      cy.get('main').should('be.visible');
      cy.contains('h1', /invitations apprenants/i).should('be.visible');
      cy.contains(/une adresse e-mail par ligne/i).should('be.visible');
      cy.get('textarea[placeholder^="email1"]').should('be.visible');
    });

    it('should have invite users button', () => {
      cy.contains(/créer les invitations/i).should('exist');
    });
  });
});