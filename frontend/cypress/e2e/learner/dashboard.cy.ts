describe('Learner Dashboard', () => {
  beforeEach(() => {
    cy.visit('/en/dashboard/learner');
  });

  it('should display the main dashboard elements', () => {
    cy.get('main').should('be.visible');
  });

  describe('Courses Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/cours');
    });

    it('should display courses list', () => {
      cy.get('main').should('be.visible');
    });

    it('should have search/filter functionality', () => {
      cy.get('input[placeholder*="search" i]').should('exist');
    });
  });

  describe('Course Detail Page', () => {
    it('should navigate to course detail', () => {
      cy.visit('/en/dashboard/learner/cours/AZ-900-UNIFIED');
      cy.get('main').should('be.visible');
    });
  });

  describe('Exams Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/examens');
    });

    it('should display exams page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Certifications Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/certifications');
    });

    it('should display certifications page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Labs Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/labs');
    });

    it('should display labs page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have AWS EC2 labs', () => {
      cy.visit('/en/dashboard/learner/labs/aws-ec2');
      cy.get('main').should('be.visible');
    });

    it('should have Azure AZ-900 labs', () => {
      cy.visit('/en/dashboard/learner/labs/azure-az900');
      cy.get('main').should('be.visible');
    });

    it('should have GCP Compute labs', () => {
      cy.visit('/en/dashboard/learner/labs/gcp-compute');
      cy.get('main').should('be.visible');
    });
  });

  describe('Emploi (Jobs) Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/emploi');
    });

    it('should display jobs page', () => {
      cy.get('main').should('be.visible');
    });

  });

  describe('CV Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/cv');
    });

    it('should display CV/Resume page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Roadmap Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/roadmap');
    });

    it('should display roadmap page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Goals Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/goals');
    });

    it('should display goals page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Profile Page', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/learner/profile');
    });

    it('should display profile page', () => {
      cy.get('main').should('be.visible');
    });
  });
});