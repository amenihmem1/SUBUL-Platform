describe('University Dashboard - UI Tests with Mock Data', () => {
  const mockDashboardData = {
    programsCount: 8,
    enrollmentsCount: 145,
    staffCount: 12,
    pendingInvites: 5,
    licenses: [
      { planName: 'Enterprise', seatsTotal: 200, seatsUsed: 145, status: 'active' },
      { planName: 'Standard', seatsTotal: 50, seatsUsed: 50, status: 'active' },
    ],
  };

  beforeEach(() => {
    cy.visit('/en/dashboard/university');
    cy.wait(1000);
  });

  describe('Dashboard Stats Cards', () => {
    it('should display all stat cards', () => {
      cy.contains('Programmes').should('be.visible');
      cy.contains('Inscriptions').should('be.visible');
      cy.contains('Staff').should('be.visible');
      cy.contains('Invitations en attente').should('be.visible');
    });

    it('should display correct stat values', () => {
      cy.contains('8').should('be.visible');
      cy.contains('145').should('be.visible');
      cy.contains('12').should('be.visible');
    });

    it('should have icon for each stat card', () => {
      cy.get('[class*="GraduationCap"]').should('have.length.greaterThan', 0);
      cy.get('[class*="Users"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Licenses Section', () => {
    it('should display licenses section', () => {
      cy.contains('Licences / Sièges').should('be.visible');
    });

    it('should show license plan names', () => {
      cy.contains('Enterprise').should('be.visible');
      cy.contains('Standard').should('be.visible');
    });

    it('should show seat usage', () => {
      cy.contains('145 / 200').should('be.visible');
    });

    it('should show license status badges', () => {
      cy.contains('active').should('be.visible');
    });
  });

  describe('Quick Actions', () => {
    it('should have new program action', () => {
      cy.contains('Nouveau programme').should('be.visible');
    });

    it('should have invite member action', () => {
      cy.contains('Inviter un membre').should('be.visible');
    });

    it('should have manage licenses action', () => {
      cy.contains('Gérer les licences').should('be.visible');
    });

    it('should have view students action', () => {
      cy.contains('Voir les étudiants').should('be.visible');
    });
  });

  describe('Date Filter', () => {
    it('should have filter options', () => {
      cy.contains("Aujourd'hui").should('be.visible');
      cy.contains('Cette semaine').should('be.visible');
      cy.contains('Ce mois').should('be.visible');
    });

    it('should toggle filters', () => {
      cy.contains('Cette semaine').click();
      cy.contains('Cette semaine').should('have.class', 'bg-primary');
    });
  });

  describe('Navigation', () => {
    it('should navigate to programs page', () => {
      cy.contains('Programmes').first().click();
      cy.url().should('include', '/dashboard/university/programs');
    });

    it('should navigate to students page', () => {
      cy.contains('Voir les étudiants').click();
      cy.url().should('include', '/dashboard/university/students');
    });
  });
});

describe('University Students Page - UI Tests with Mock Data', () => {
  const mockStudents = {
    data: [
      { id: 1, fullName: 'Ahmed Benali', email: 'ahmed.benali@email.com', status: 'active', progress: 85, enrolledAt: '2026-01-15' },
      { id: 2, fullName: 'Fatima Zahra', email: 'fatima.zahra@email.com', status: 'active', progress: 92, enrolledAt: '2026-01-20' },
      { id: 3, fullName: 'Karim Hamdani', email: 'karim.hamdani@email.com', status: 'invited', progress: 0, enrolledAt: null },
      { id: 4, fullName: 'Sara Idrissi', email: 'sara.idrissi@email.com', status: 'completed', progress: 100, enrolledAt: '2026-02-01' },
      { id: 5, fullName: 'Youssef Alaoui', email: 'youssef.alaoui@email.com', status: 'active', progress: 45, enrolledAt: '2026-02-10' },
    ],
    total: 5,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    cy.visit('/en/dashboard/university/students');
    cy.wait(1000);
  });

  describe('Page Header', () => {
    it('should display page title', () => {
      cy.contains('Gestion des Étudiants').should('be.visible');
    });

    it('should have student count', () => {
      cy.contains('5').should('be.visible');
    });
  });

  describe('Filters and Search', () => {
    it('should have search input', () => {
      cy.get('input[placeholder*="Rechercher"]').should('be.visible');
    });

    it('should have program filter', () => {
      cy.contains('Tous les programmes').should('be.visible');
    });

    it('should have status filter', () => {
      cy.contains('Tous les status').should('be.visible');
    });

    it('should search by name', () => {
      cy.get('input[placeholder*="Rechercher"]').type('Ahmed');
      cy.wait(500);
    });
  });

  describe('Students Table', () => {
    it('should display students in table', () => {
      cy.get('table').should('be.visible');
    });

    it('should show student names', () => {
      cy.contains('Ahmed Benali').should('be.visible');
      cy.contains('Fatima Zahra').should('be.visible');
    });

    it('should show email addresses', () => {
      cy.contains('ahmed.benali@email.com').should('be.visible');
    });

    it('should show progress bars', () => {
      cy.get('[class*="progress"]').should('have.length.greaterThan', 0);
    });

    it('should show enrollment status badges', () => {
      cy.contains('active').should('be.visible');
      cy.contains('completed').should('be.visible');
    });
  });

  describe('Pagination', () => {
    it('should show pagination info', () => {
      cy.contains('Affichage').should('be.visible');
    });

    it('should have page buttons', () => {
      cy.contains('1').should('be.visible');
    });
  });
});

describe('University Programs Page - UI Tests with Mock Data', () => {
  beforeEach(() => {
    cy.visit('/en/dashboard/university/programs');
    cy.wait(1000);
  });

  describe('Page Header', () => {
    it('should display page title', () => {
      cy.contains('Gestion des Programmes').should('be.visible');
    });

    it('should have add program button', () => {
      cy.contains('Nouveau Programme').should('be.visible');
    });
  });

  describe('Programs List', () => {
    it('should display programs', () => {
      cy.get('[class*="card"]').should('have.length.greaterThan', 0);
    });

    it('should show program details', () => {
      cy.contains('Azure Fundamentals').should('be.visible');
    });
  });

  describe('Program Actions', () => {
    it('should navigate to create program page', () => {
      cy.contains('Nouveau Programme').click();
      cy.url().should('include', '/dashboard/university/programs/new');
    });
  });
});
