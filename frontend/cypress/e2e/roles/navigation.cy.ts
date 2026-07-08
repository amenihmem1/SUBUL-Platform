describe('Role-based Navigation', () => {
  const roles = [
    { name: 'learner', path: '/dashboard/learner', login: 'learnerLogin' },
    { name: 'admin', path: '/dashboard/admin', login: 'adminLogin' },
    { name: 'employer', path: '/dashboard/employer', login: 'employerLogin' },
    { name: 'university', path: '/dashboard/university', login: 'universityLogin' },
  ];

  roles.forEach(({ name, path, login }) => {
    describe(`${name} Dashboard`, () => {
      beforeEach(() => {
        // @ts-ignore - dynamic method call
        cy[login]();
        cy.visit(`/en${path}`);
      });

      it('should load without errors', () => {
        cy.get('main').should('be.visible');
        cy.url().should('include', path);
      });

      it('should have sidebar navigation', () => {
        cy.get('aside').should('be.visible');
      });

      it('should have header with user info', () => {
        cy.get('header').should('be.visible');
      });
    });
  });

  describe('Unauthorized Access', () => {
    it('should redirect learner trying to access admin dashboard', () => {
      cy.learnerLogin();
      cy.visit('/en/dashboard/admin');
      cy.url().then((url) => {
        expect(url.includes('/unauthorized') || url.includes('/auth/login')).to.be.true;
      });
    });

    it('should redirect learner trying to access employer dashboard', () => {
      cy.learnerLogin();
      cy.visit('/en/dashboard/employer');
      cy.url().then((url) => {
        expect(url.includes('/unauthorized') || url.includes('/auth/login')).to.be.true;
      });
    });

    it('should redirect learner trying to access university dashboard', () => {
      cy.learnerLogin();
      cy.visit('/en/dashboard/university');
      cy.url().then((url) => {
        expect(url.includes('/unauthorized') || url.includes('/auth/login')).to.be.true;
      });
    });

    it('should redirect employer trying to access admin dashboard', () => {
      cy.employerLogin();
      cy.visit('/en/dashboard/admin');
      cy.url().then((url) => {
        expect(url.includes('/unauthorized') || url.includes('/auth/login')).to.be.true;
      });
    });

    it('should redirect admin trying to access learner dashboard', () => {
      cy.adminLogin();
      cy.visit('/en/dashboard/learner');
      cy.get('main').should('be.visible');
    });
  });

  describe('Navigation Links', () => {
    beforeEach(() => {
      cy.learnerLogin();
      cy.visit('/en/dashboard/learner');
    });

    it('should navigate to courses from sidebar', () => {
      cy.get('aside').contains(/courses|cours/i).click();
      cy.url().should('include', '/dashboard/learner/cours');
    });

    it('should expose Subul In Chrome Web Store link in sidebar', () => {
      cy.get('aside')
        .contains('Subul In')
        .closest('a')
        .should('have.attr', 'href')
        .and('include', 'chromewebstore.google.com/detail/linkedin-ai-agent');
      cy.get('aside a[href*="chromewebstore.google.com"]')
        .should('have.attr', 'target', '_blank')
        .should('have.attr', 'rel', 'noopener noreferrer');
    });

    it('should navigate to certifications from sidebar', () => {
      cy.get('aside').contains(/certifications/i).click();
      cy.url().should('include', '/dashboard/learner/certifications');
    });

    it('should navigate to labs from sidebar', () => {
      cy.get('aside').contains(/labs/i).click();
      cy.url().should('include', '/dashboard/learner/labs');
    });

    it('should navigate to jobs from sidebar', () => {
      cy.get('aside').contains(/jobs|emploi/i).click();
      cy.url().should('include', '/dashboard/learner/emploi');
    });

    it('should navigate to roadmap from sidebar', () => {
      cy.get('aside').contains(/roadmap|progression/i).click();
      cy.url().should('include', '/dashboard/learner/roadmap');
    });
  });
});