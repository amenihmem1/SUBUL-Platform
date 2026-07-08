describe('Employer Dashboard', () => {
  beforeEach(() => {
    cy.visit('/en/dashboard/employer');
  });

  it('should display the employer dashboard', () => {
    cy.get('main').should('be.visible');
  });

  describe('Offres (Job Offers) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/offres');
    });

    it('should display job offers page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have create new job offer button', () => {
      cy.contains(/new|add|create|post/i).should('exist');
    });
  });

  describe('Candidats (Candidates) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/candidats');
    });

    it('should display candidates page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have candidates list/table', () => {
      cy.get('table').should('exist');
    });
  });

  describe('Certifies (Certified Users) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/certifies');
    });

    it('should display certified users page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Employes (Employees) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/employes');
    });

    it('should display employees page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Entretiens (Interviews) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/entretiens');
    });

    it('should display interviews page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Settings Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/employer/settings');
    });

    it('should display employer settings page', () => {
      cy.get('main').should('be.visible');
    });
  });
});