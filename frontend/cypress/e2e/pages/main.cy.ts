describe('Main Pages', () => {
  describe('Landing Page', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should display the landing page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have navigation to login', () => {
      cy.contains(/login|sign in/i).should('be.visible');
    });

    it('should have navigation to register', () => {
      cy.contains(/register|sign up|get started/i).should('be.visible');
    });

    it('should have language switcher', () => {
      cy.get('select, [class*="language"], [data-testid*="language"]').should('exist');
    });
  });

  describe('Unauthorized Page', () => {
    it('should display unauthorized page', () => {
      cy.visit('/unauthorized');
      cy.get('main').should('be.visible');
    });
  });

  describe('Cookies Page', () => {
    it('should display cookies page', () => {
      cy.visit('/en/cookies');
      cy.get('main').should('be.visible');
    });
  });

  describe('Privacy Page', () => {
    it('should display privacy page', () => {
      cy.visit('/en/privacy');
      cy.get('main').should('be.visible');
    });
  });

  describe('Terms Page', () => {
    it('should display terms page', () => {
      cy.visit('/en/terms');
      cy.get('main').should('be.visible');
    });
  });
});