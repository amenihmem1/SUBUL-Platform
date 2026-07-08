describe('Admin Courses Management', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin/courses');
  });

  it('should display courses page', () => {
    cy.get('main').should('be.visible');
    cy.contains(/courses|formations/i).should('be.visible');
  });

  it('should have create new course button', () => {
    cy.contains(/new|nouveau|ajouter/i).should('exist');
  });

  it('should have search functionality', () => {
    cy.get('input[placeholder*="search" i]').should('exist');
  });

  describe('Create New Course', () => {
    beforeEach(() => {
      cy.visit('/en/dashboard/admin/courses/new');
    });

    it('should display create course form', () => {
      cy.get('main').should('be.visible');
      cy.get('input[name="title"]').should('exist');
      cy.get('textarea[name="description"]').should('exist');
    });

    it('should have save button', () => {
      cy.contains(/save|enregistrer|create/i).should('exist');
    });
  });

  describe('Course Detail', () => {
    it('should navigate to course edit', () => {
      cy.visit('/en/dashboard/admin/courses/1');
      cy.get('main').should('be.visible');
    });
  });
});