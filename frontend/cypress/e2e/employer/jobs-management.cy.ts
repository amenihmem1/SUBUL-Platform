describe('Employer Job Management', () => {
  beforeEach(() => {
    cy.employerLogin();
    cy.visit('/en/dashboard/employer');
  });

  it('should display employer dashboard', () => {
    cy.get('main').should('be.visible');
  });

  describe('Job Offers Page', () => {
    beforeEach(() => {
      cy.employerLogin();
      cy.visit('/en/dashboard/employer/offres');
    });

    it('should display job offers page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/offres|jobs/i).should('be.visible');
    });

    it('should have create new job button', () => {
      cy.contains(/new|nouveau|ajouter|create/i).should('exist');
    });
  });

  describe('Candidates Page', () => {
    beforeEach(() => {
      cy.employerLogin();
      cy.visit('/en/dashboard/employer/candidats');
    });

    it('should display candidates page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/candidats|candidates/i).should('be.visible');
    });

    it('should have search functionality', () => {
      cy.get('input[placeholder*="search" i]').should('exist');
    });
  });

  describe('Interviews Page', () => {
    beforeEach(() => {
      cy.employerLogin();
      cy.visit('/en/dashboard/employer/entretiens');
    });

    it('should display interviews page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/entretiens|interviews/i).should('be.visible');
    });
  });

  describe('Employees Page', () => {
    beforeEach(() => {
      cy.employerLogin();
      cy.visit('/en/dashboard/employer/employes');
    });

    it('should display employees page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/employés|employees/i).should('be.visible');
    });
  });

  describe('Settings Page', () => {
    beforeEach(() => {
      cy.employerLogin();
      cy.visit('/en/dashboard/employer/settings');
    });

    it('should display settings page', () => {
      cy.get('main').should('be.visible');
      cy.contains(/settings|paramètres/i).should('be.visible');
    });
  });
});