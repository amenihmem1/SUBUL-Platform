describe('Admin Dashboard - UI Tests with Mock Data', () => {
  const mockStats = {
    totalUsers: 156,
    activeUsers: 142,
    pendingUsers: 8,
    monthlyRevenue: '12500.00',
  };

  const mockOverview = {
    universitiesCount: 12,
    activeSubscriptions: 45,
    pendingUsers: 8,
    agentUsageMonth: 'Mars 2026',
    topAgentUsage: [
      { email: 'ahmed.benali@email.com', count: 342 },
      { email: 'fatima.zahra@email.com', count: 298 },
    ],
  };

  const mockUsers = {
    data: [
      { id: 1, fullName: 'Dr. Ahmed Benali', email: 'ahmed.benali@subul.dev', role: 'instructor', status: 'active' },
      { id: 2, fullName: 'Fatima Zahra', email: 'fatima.zahra@subul.dev', role: 'learner', status: 'active' },
      { id: 3, fullName: 'Karim Hamdani', email: 'karim.hamdani@subul.dev', role: 'employer', status: 'inactive' },
      { id: 4, fullName: 'Sara Idrissi', email: 'sara.idrissi@subul.dev', role: 'university', status: 'active' },
      { id: 5, fullName: 'Youssef Alaoui', email: 'youssef.alaoui@subul.dev', role: 'learner', status: 'pending' },
      { id: 6, fullName: 'Layla Tahiri', email: 'layla.tahiri@subul.dev', role: 'student', status: 'active' },
      { id: 7, fullName: 'Omar Benjelloun', email: 'omar.benjelloun@subul.dev', role: 'admin', status: 'active' },
      { id: 8, fullName: 'Nadia Cherkaoui', email: 'nadia.cherkaoui@subul.dev', role: 'learner', status: 'active' },
    ],
    total: 8,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    cy.visit('/en/dashboard/admin');
    cy.wait(1000);
  });

  describe('Dashboard Stats Display', () => {
    it('should display correct stats from API', () => {
      cy.get('[data-testid="admin-stats"]').should('be.visible');
      cy.get('text="Total Utilisateurs"').should('contain', mockStats.totalUsers);
    });

    it('should show overview cards with correct data', () => {
      cy.contains('Universités').should('be.visible');
      cy.contains('Abonnements actifs').should('be.visible');
      cy.contains('En attente').should('be.visible');
    });

    it('should display revenue information', () => {
      cy.contains('$12,500.00').should('be.visible');
    });
  });

  describe('Recent Users Table', () => {
    it('should display users in table format', () => {
      cy.get('table').should('be.visible');
      cy.contains('Dr. Ahmed Benali').should('be.visible');
      cy.contains('ahmed.benali@subul.dev').should('be.visible');
    });

    it('should show user role badges', () => {
      cy.contains('instructor').should('be.visible');
      cy.contains('learner').should('be.visible');
    });

    it('should show user status badges', () => {
      cy.contains('active').should('be.visible');
      cy.contains('inactive').should('be.visible');
    });

    it('should have action buttons for each user', () => {
      cy.get('button[aria-label*="View"]').should('have.length.greaterThan', 0);
      cy.get('button[aria-label*="Edit"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Quick Actions', () => {
    it('should have add new user action', () => {
      cy.contains("Ajouter un nouvel utilisateur").should('be.visible');
    });

    it('should have create certification action', () => {
      cy.contains('Créer une certification').should('be.visible');
    });

    it('should have generate report action', () => {
      cy.contains('Générer un rapport').should('be.visible');
    });

    it('should have view analytics action', () => {
      cy.contains('Voir les Analytics').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate to users page on button click', () => {
      cy.contains("Voir tout").first().click();
      cy.url().should('include', '/dashboard/admin/users');
    });

    it('should open change password modal', () => {
      cy.get('button[aria-label*="password"]').first().click();
      cy.get('[role="dialog"]').should('be.visible');
    });
  });

  describe('Date Filter Toggles', () => {
    it('should have today, week, month filter options', () => {
      cy.contains("Aujourd'hui").should('be.visible');
      cy.contains('Cette semaine').should('be.visible');
      cy.contains('Ce mois').should('be.visible');
    });

    it('should toggle between filter options', () => {
      cy.contains('Cette semaine').click();
      cy.contains('Cette semaine').should('have.class', 'bg-primary');
    });
  });

  describe('System Notification', () => {
    it('should display system notification banner', () => {
      cy.contains("Notification système").should('be.visible');
    });
  });
});

describe('Admin Users Page - UI Tests with Mock Data', () => {
  const mockUsers = {
    data: [
      { id: 1, fullName: 'Dr. Ahmed Benali', email: 'ahmed.benali@subul.dev', role: 'instructor', status: 'active', createdAt: '2026-01-15' },
      { id: 2, fullName: 'Fatima Zahra', email: 'fatima.zahra@subul.dev', role: 'learner', status: 'active', createdAt: '2026-01-20' },
      { id: 3, fullName: 'Karim Hamdani', email: 'karim.hamdani@subul.dev', role: 'employer', status: 'inactive', createdAt: '2026-02-01' },
      { id: 4, fullName: 'Sara Idrissi', email: 'sara.idrissi@subul.dev', role: 'university', status: 'active', createdAt: '2026-02-10' },
      { id: 5, fullName: 'Youssef Alaoui', email: 'youssef.alaoui@subul.dev', role: 'learner', status: 'pending', createdAt: '2026-03-01' },
    ],
    total: 5,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    cy.visit('/en/dashboard/admin/users');
    cy.wait(1000);
  });

  describe('Page Header', () => {
    it('should display page title', () => {
      cy.contains('Gestion des Utilisateurs').should('be.visible');
    });

    it('should have add user button', () => {
      cy.contains('Nouvel Utilisateur').should('be.visible');
    });
  });

  describe('Filters', () => {
    it('should have role filter dropdown', () => {
      cy.get('select').should('be.visible');
      cy.get('select').contains('Tous les rôles');
    });

    it('should have status filter dropdown', () => {
      cy.get('select').should('be.visible');
    });

    it('should have search input', () => {
      cy.get('input[placeholder*="Rechercher"]').should('be.visible');
    });

    it('should filter by role when selected', () => {
      cy.get('select').first().select('learner');
      cy.wait(500);
    });
  });

  describe('Users Table', () => {
    it('should display users in table', () => {
      cy.get('table').should('be.visible');
    });

    it('should show pagination info', () => {
      cy.contains('Affichage').should('be.visible');
    });

    it('should have pagination controls', () => {
      cy.get('button').contains('1').should('be.visible');
      cy.get('button').contains('2').should('be.visible');
    });
  });

  describe('Create User Flow', () => {
    it('should navigate to create user page', () => {
      cy.contains('Nouvel Utilisateur').click();
      cy.url().should('include', '/dashboard/admin/users/new');
    });
  });
});

describe('Admin User Create/Edit - UI Tests with Mock Data', () => {
  beforeEach(() => {
    cy.visit('/en/dashboard/admin/users/new');
    cy.wait(1000);
  });

  describe('Create User Form', () => {
    it('should display create user form', () => {
      cy.contains('Créer un Nouvel Utilisateur').should('be.visible');
    });

    it('should have full name input', () => {
      cy.get('input[name="fullName"]').should('be.visible');
    });

    it('should have email input', () => {
      cy.get('input[name="email"]').should('be.visible');
    });

    it('should have password input', () => {
      cy.get('input[name="password"]').should('be.visible');
    });

    it('should have role select', () => {
      cy.get('select[name="role"]').should('be.visible');
    });

    it('should have submit button', () => {
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('button[type="submit"]').click();
      cy.contains('Le nom complet est requis').should('be.visible');
      cy.contains('L\'email est requis').should('be.visible');
    });

    it('should show password requirements', () => {
      cy.contains('au moins 8 caractères').should('be.visible');
      cy.contains('une majuscule').should('be.visible');
    });
  });

  describe('Role Selection', () => {
    it('should have all role options', () => {
      cy.get('select[name="role"]').find('option').should('have.length.greaterThan', 1);
    });

    it('should select learner role', () => {
      cy.get('select[name="role"]').select('learner');
      cy.get('select[name="role"]').should('have.value', 'learner');
    });

    it('should select instructor role', () => {
      cy.get('select[name="role"]').select('instructor');
      cy.get('select[name="role"]').should('have.value', 'instructor');
    });
  });
});
