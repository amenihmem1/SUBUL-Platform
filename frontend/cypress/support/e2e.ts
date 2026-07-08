import './commands';

Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

beforeEach(() => {
  cy.clearCookies();
  cy.clearLocalStorage();
});