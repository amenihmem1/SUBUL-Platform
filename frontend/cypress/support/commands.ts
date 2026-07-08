/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      adminLogin(): Chainable<{ email: string; password: string }>;
      learnerLogin(): Chainable<{ email: string; password: string }>;
      employerLogin(): Chainable<{ email: string; password: string }>;
      universityLogin(): Chainable<{ email: string; password: string }>;
      instructorLogin(): Chainable<{ email: string; password: string }>;
      loginWithAuth0(role?: string): Chainable<void>;
      logout(): Chainable<void>;
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      assertLoggedIn(): Chainable<void>;
      assertNotLoggedIn(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/en/auth/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/auth/login');
});

Cypress.Commands.add('adminLogin', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  const email = (Cypress.env('adminEmail') as string) || 'admin@subul.dev';
  const password = (Cypress.env('adminPassword') as string) || 'SeedPassword123!';

  cy.session(
    `admin:${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email, password },
      }).then((res) => {
        expect(res.body).to.have.property('access_token');
        const token = res.body.access_token as string;

        // Prime app origin with token in localStorage + cookie (matches frontend `setToken`)
        cy.visit('/en', {
          onBeforeLoad(win) {
            win.localStorage.setItem('access_token', token);
          },
        });
        cy.setCookie('access_token', encodeURIComponent(token));
      });
    },
    {
      validate: () => {
        cy.getCookie('access_token').should('exist');
      },
    },
  );

  return cy.wrap({ email, password });
});

Cypress.Commands.add('universityLogin', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  const email = (Cypress.env('universityEmail') as string) || 'university@subul.dev';
  const password = (Cypress.env('universityPassword') as string) || 'SeedPassword123!';

  cy.session(
    `university:${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email, password },
      }).then((res) => {
        expect(res.body).to.have.property('access_token');
        const token = res.body.access_token as string;

        cy.visit('/en', {
          onBeforeLoad(win) {
            win.localStorage.setItem('access_token', token);
          },
        });
        cy.setCookie('access_token', encodeURIComponent(token));
      });
    },
    {
      validate: () => {
        cy.getCookie('access_token').should('exist');
      },
    },
  );

  return cy.wrap({ email, password });
});

Cypress.Commands.add('learnerLogin', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  const email = (Cypress.env('learnerEmail') as string) || 'learner@subul.dev';
  const password = (Cypress.env('learnerPassword') as string) || 'SeedPassword123!';

  cy.session(
    `learner:${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email, password },
      }).then((res) => {
        expect(res.body).to.have.property('access_token');
        const token = res.body.access_token as string;

        cy.visit('/en', {
          onBeforeLoad(win) {
            win.localStorage.setItem('access_token', token);
          },
        });
        cy.setCookie('access_token', encodeURIComponent(token));
      });
    },
    {
      validate: () => {
        cy.getCookie('access_token').should('exist');
      },
    },
  );

  return cy.wrap({ email, password });
});

Cypress.Commands.add('employerLogin', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  const email = (Cypress.env('employerEmail') as string) || 'employer@subul.dev';
  const password = (Cypress.env('employerPassword') as string) || 'SeedPassword123!';

  cy.session(
    `employer:${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email, password },
      }).then((res) => {
        expect(res.body).to.have.property('access_token');
        const token = res.body.access_token as string;

        cy.visit('/en', {
          onBeforeLoad(win) {
            win.localStorage.setItem('access_token', token);
          },
        });
        cy.setCookie('access_token', encodeURIComponent(token));
      });
    },
    {
      validate: () => {
        cy.getCookie('access_token').should('exist');
      },
    },
  );

  return cy.wrap({ email, password });
});

Cypress.Commands.add('loginWithAuth0', (role = 'learner') => {
  cy.visit(`/en/auth/login?role=${role}`);
  cy.url().should('include', 'auth0');
});

Cypress.Commands.add('instructorLogin', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  const email = (Cypress.env('instructorEmail') as string) || 'instructor@subul.dev';
  const password = (Cypress.env('instructorPassword') as string) || 'SeedPassword123!';

  cy.session(
    `instructor:${email}`,
    () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email, password },
      }).then((res) => {
        expect(res.body).to.have.property('access_token');
        const token = res.body.access_token as string;

        cy.visit('/en', {
          onBeforeLoad(win) {
            win.localStorage.setItem('access_token', token);
          },
        });
        cy.setCookie('access_token', encodeURIComponent(token));
      });
    },
    {
      validate: () => {
        cy.getCookie('access_token').should('exist');
      },
    },
  );

  return cy.wrap({ email, password });
});

Cypress.Commands.add('logout', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  cy.request(`${apiUrl}/api/auth/logout`).then(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });
});

Cypress.Commands.add('assertLoggedIn', () => {
  cy.getCookie('access_token').should('exist');
});

Cypress.Commands.add('assertNotLoggedIn', () => {
  cy.getCookie('access_token').should('not.exist');
});

export {};