describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.adminLogin();
    cy.visit('/en/dashboard/admin');
  });

  it('should display the admin dashboard', () => {
    cy.get('main').should('be.visible');
  });

  describe('Users Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/users');
    });

    it('should display users page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have user list/table', () => {
      cy.get('table').should('exist');
    });
  });

  describe('Universities Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/universities');
    });

    it('should display universities page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Companies Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/companies');
    });

    it('should display companies page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Recruiters Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/recruiters');
    });

    it('should display recruiters page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Courses Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/courses');
    });

    it('should display courses page', () => {
      cy.get('main').should('be.visible');
    });

    it('should have create new course button', () => {
      cy.get('a[href*="/dashboard/admin/courses/new"]').should('exist');
    });
  });

  describe('Course Detail/Edit Page', () => {
    it('should display course edit page', () => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/courses/AZ-900-UNIFIED');
      cy.get('main').should('be.visible');
    });
  });

  describe('New Course Page', () => {
    it('should display new course page', () => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/courses/new');
      cy.get('main').should('be.visible');
    });
  });

  describe('Instructors Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/instructors');
    });

    it('should display instructors page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Labs Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/labs');
    });

    it('should display labs admin page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Assessments Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/assessments');
    });

    it('should display assessments page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Jobs Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/jobs');
    });

    it('should display jobs admin page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Certifications Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/certifications');
    });

    it('should display certifications page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Analytics Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/analytics');
    });

    it('should display analytics page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Progression Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/progression');
    });

    it('should display progression page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Feedback Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/feedback');
    });

    it('should display feedback page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Agent Usage Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/agent-usage');
    });

    it('should display agent usage page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Payments Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/payments');
    });

    it('should display payments page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Settings Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/settings');
    });

    it('should display settings page', () => {
      cy.get('main').should('be.visible');
    });
  });

  describe('Profile Page', () => {
    beforeEach(() => {
      cy.adminLogin();
      cy.visit('/en/dashboard/admin/profile');
    });

    it('should display admin profile page', () => {
      cy.get('main').should('be.visible');
    });
  });
});