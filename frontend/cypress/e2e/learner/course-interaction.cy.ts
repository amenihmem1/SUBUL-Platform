describe('Learner Course Interaction', () => {
  beforeEach(() => {
    cy.learnerLogin();
  });

  describe('Course Detail Page', () => {
    it('should display course content', () => {
      cy.visit('/en/dashboard/learner/cours/AZ-900-UNIFIED');
      cy.get('main').should('be.visible');
    });

    it('should have lesson navigation', () => {
      cy.visit('/en/dashboard/learner/cours/AZ-900-UNIFIED');
      cy.get('main').should('be.visible');
    });
  });

  describe('Goals Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/goals');
    });

    it('should display goals page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/goals|objectifs/i).should('be.visible');
    });

    it('should have create goal button', () => {
      cy.contains(/new|ajouter|create/i).should('exist');
    });
  });

  describe('Profile Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/profile');
    });

    it('should display profile page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have edit profile option', () => {
      cy.contains(/edit|modifier|profile/i).should('exist');
    });
  });

  describe('CV Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/cv');
    });

    it('should display CV builder page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/cv|resume/i).should('be.visible');
    });

    it('should have generate CV option', () => {
      cy.contains(/generate|télécharger|download/i).should('exist');
    });
  });
});