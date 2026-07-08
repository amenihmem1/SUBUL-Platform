describe('Auth Pages', () => {
  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/en/auth/login');
    });

    it('should display login form', () => {
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.contains(/email is required|invalid email/i).should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.get('input[name="email"]').type('invalid-email');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      cy.contains(/invalid email|valid email/i).should('be.visible');
    });

    it('should have link to register page', () => {
      cy.contains(/register|sign up/i).should('be.visible').click();
      cy.url().should('include', '/auth/register');
    });

    it('should have link to forgot password page', () => {
      cy.contains(/forgot password|reset password/i).should('be.visible');
    });

    it('should have Auth0 login option', () => {
      cy.contains(/auth0|continue with|sign in with/i).should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[name="email"]').type('wrong@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      cy.contains(/invalid credentials|unauthorized|wrong/i).should('be.visible');
    });
  });

  describe('Register Page', () => {
    beforeEach(() => {
      cy.visit('/en/auth/register');
    });

    it('should display registration form', () => {
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('input[name="confirmPassword"]').should('be.visible');
      cy.get('input[name="fullName"]').should('be.visible');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.contains(/required|email is required/i).should('be.visible');
    });

    it('should show error for password mismatch', () => {
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="fullName"]').type('Test User');
      cy.get('input[name="password"]').type('Password123');
      cy.get('input[name="confirmPassword"]').type('DifferentPassword123');
      cy.get('button[type="submit"]').click();
      cy.contains(/password.*match|not match/i).should('be.visible');
    });

    it('should have role selection', () => {
      cy.contains(/role|i am a|register as/i).should('be.visible');
    });

    it('should have link to login page', () => {
      cy.contains(/login|sign in/i).should('be.visible').click();
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Forgot Password Page', () => {
    beforeEach(() => {
      cy.visit('/en/auth/forgot-password');
    });

    it('should display forgot password form', () => {
      cy.get('input[name="email"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show success message after submitting email', () => {
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      cy.contains(/check your email|reset link|sent/i).should('be.visible');
    });
  });
});