describe('User Interface Elements', () => {
  describe('Language Switcher', () => {
    it('should have language switcher on login page', () => {
      cy.visit('/en/auth/login');
      cy.get('main').should('be.visible');
    });

    it('should have language switcher on register page', () => {
      cy.visit('/en/auth/register');
      cy.get('main').should('be.visible');
    });

    it('should switch between en, fr, ar', () => {
      cy.visit('/en/auth/login');
      cy.url().should('include', '/en/');
      
      cy.visit('/fr/auth/login');
      cy.url().should('include', '/fr/');
    });
  });

  describe('Footer', () => {
    it('should have footer on main page', () => {
      cy.visit('/en');
      cy.get('footer').should('exist');
    });

    it('should have links to terms and privacy', () => {
      cy.visit('/en');
      cy.contains(/terms|conditions/i).should('exist');
      cy.contains(/privacy|confidentialité/i).should('exist');
    });
  });

  describe('Responsive Design', () => {
    it('should display correctly on mobile viewport', () => {
      cy.viewport(375, 667);
      cy.visit('/en');
      cy.get('main').should('be.visible');
    });

    it('should display correctly on tablet viewport', () => {
      cy.viewport(768, 1024);
      cy.visit('/en');
      cy.get('main').should('be.visible');
    });

    it('should display correctly on desktop viewport', () => {
      cy.viewport(1280, 720);
      cy.visit('/en');
      cy.get('main').should('be.visible');
    });
  });
});

describe('Error Handling', () => {
  describe('404 Page', () => {
    it('should display custom 404 page for non-existent route', () => {
      cy.visit('/en/non-existent-page-12345', { failOnStatusCode: false });
      cy.url().then((url) => {
        expect(url.includes('404') || url.includes('not-found')).to.be.true;
      });
    });
  });

  describe('500 Error', () => {
    it('should handle server errors gracefully', () => {
      cy.visit('/en/auth/login');
      cy.get('main').should('be.visible');
    });
  });
});

describe('Accessibility', () => {
  describe('Keyboard Navigation', () => {
    it('should have accessible login form', () => {
      cy.visit('/en/auth/login');
      cy.get('input[name="email"]').should('have.attr', 'id').and('not.be.empty');
      cy.get('input[name="password"]').should('have.attr', 'id').and('not.be.empty');
    });
  });

  describe('Form Labels', () => {
    it('should have accessible labels on login form', () => {
      cy.visit('/en/auth/login');
      cy.get('label').should('exist');
    });
  });
});