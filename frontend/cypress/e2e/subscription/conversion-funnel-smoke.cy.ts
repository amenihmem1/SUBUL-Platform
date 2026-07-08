describe('Subscription conversion funnel smoke', () => {
  it('keeps free-first path from landing CTA to register', () => {
    cy.visit('/fr');
    cy.contains(/start free|commencer gratuitement|essayer gratuitement/i)
      .first()
      .should('be.visible')
      .and('have.attr', 'href')
      .and('include', '/auth/register');
  });

  it('keeps selected plan and cycle on checkout entry', () => {
    cy.visit('/fr/checkout?plan=premium&cycle=annual&mode=upgrade&source=certifications');
    cy.url().should('include', 'plan=premium');
    cy.url().should('include', 'cycle=annual');
    cy.contains(/Choisissez votre période|periode/i).should('be.visible');
  });

  it('renders payment cancel retry CTA with deterministic checkout target', () => {
    cy.visit('/fr/payment/cancel');
    cy.contains(/réessayer|retry|retour au paiement/i)
      .first()
      .should('be.visible')
      .and('have.attr', 'href')
      .and('include', '/checkout?');
  });
});
