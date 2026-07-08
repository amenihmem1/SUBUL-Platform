describe('Admin Labs Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/labs');
  });

  it('should display labs page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/labs|environments/i).should('be.visible');
  });

  it('should have create new lab button', () => {
    cy.contains(/new|nouveau|ajouter|create/i).should('exist');
  });

  it('should have AWS labs section', () => {
    cy.contains(/aws|amazon/i).should('exist');
  });

  it('should have Azure labs section', () => {
    cy.contains(/azure|microsoft/i).should('exist');
  });

  it('should have GCP labs section', () => {
    cy.contains(/gcp|google/i).should('exist');
  });
});

describe('Admin Users Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/users');
  });

  it('should display users page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/users|utilisateurs/i).should('be.visible');
  });

  it('should have search functionality', () => {
    cy.get('input[placeholder*="search" i]').should('exist');
  });

  it('should have filter by role', () => {
    cy.contains(/role|filtre/i).should('exist');
  });

  describe('Create User', () => {
    it('should have create user button', () => {
      cy.contains(/create|ajouter|nouveau/i).should('exist');
    });
  });
});

describe('Admin Companies Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/companies');
  });

  it('should display companies page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/companies|entreprises/i).should('be.visible');
  });
});

describe('Admin Jobs Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/jobs');
  });

  it('should display jobs page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/jobs|offres/i).should('be.visible');
  });
});

describe('Admin Feedback Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/feedback');
  });

  it('should display feedback page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/feedback|avis/i).should('be.visible');
  });
});

describe('Admin Assessments Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/assessments');
  });

  it('should display assessments page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/assessments|evaluations|examens/i).should('be.visible');
  });
});