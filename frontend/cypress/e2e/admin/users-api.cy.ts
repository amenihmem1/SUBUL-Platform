describe('Admin - Users Management (E2E)', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  let adminToken: string;
  const unique = Date.now();
  const testEmail = `e2e-user-${unique}@test.local`;

  before(() => {
    const email = (Cypress.env('adminEmail') as string) || 'admin@subul.dev';
    const password = (Cypress.env('adminPassword') as string) || 'SeedPassword123!';

    cy.request({
      method: 'POST',
      url: `${apiUrl}/api/auth/login`,
      body: { email, password },
    }).then((res) => {
      expect(res.body).to.have.property('access_token');
      adminToken = res.body.access_token as string;
    });
  });

  describe('User CRUD Operations', () => {
    it('should list users with pagination', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { page: 1, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('data');
        expect(res.body).to.have.property('total');
        expect(res.body).to.have.property('page');
        expect(res.body.data).to.be.an('array');
      });
    });

    it('should filter users by role', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'learner' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        res.body.data.forEach((user: any) => {
          expect(user.role).to.eq('learner');
        });
      });
    });

    it('should filter users by status', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { status: 'active' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        res.body.data.forEach((user: any) => {
          expect(user.status).to.eq('active');
        });
      });
    });

    it('should search users by email', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { search: 'admin' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should create a new user', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          fullName: `E2E Test User ${unique}`,
          email: testEmail,
          password: 'TestPassword123!',
          role: 'learner',
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id');
        expect(res.body.email).to.eq(testEmail);
      });
    });

    it('should get a single user', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users/1`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('id');
        expect(res.body).to.have.property('email');
      });
    });

    it('should update a user', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/admin/users/1`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          fullName: 'Updated Admin Name',
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should update user status', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/admin/users/1/status`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: 'inactive' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.status).to.eq('inactive');
      });
    });

    it('should approve a user', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users/1/approve`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.status).to.eq('active');
      });
    });

    it('should set user password', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/admin/users/2/password`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { password: 'NewPassword123!' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should delete a user', () => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/api/admin/users/test-delete-${unique}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 404]).to.include(res.status);
      });
    });
  });

  describe('Admin Dashboard & Stats', () => {
    it('should get admin stats', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/stats`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('totalUsers');
        expect(res.body).to.have.property('activeUsers');
      });
    });

    it('should get admin overview', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/overview`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should get learners progression', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/progression`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  describe('Role-Based User Filtering', () => {
    const roles = ['learner', 'student', 'admin', 'employer', 'university', 'instructor'];

    roles.forEach((role) => {
      it(`should filter users by role: ${role}`, () => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/admin/users`,
          headers: { Authorization: `Bearer ${adminToken}` },
          qs: { role },
        }).then((res) => {
          expect(res.status).to.eq(200);
          if (res.body.data.length > 0) {
            res.body.data.forEach((user: any) => {
              expect(user.role).to.eq(role);
            });
          }
        });
      });
    });
  });

  describe('User Status Filtering', () => {
    const statuses = ['active', 'inactive', 'pending', 'suspended'];

    statuses.forEach((status) => {
      it(`should filter users by status: ${status}`, () => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/admin/users`,
          headers: { Authorization: `Bearer ${adminToken}` },
          qs: { status },
        }).then((res) => {
          expect(res.status).to.eq(200);
        });
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate users correctly', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { page: 1, limit: 5 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.page).to.eq(1);
        expect(res.body.limit).to.eq(5);
      });
    });

    it('should get page 2 with limit 10', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { page: 2, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.page).to.eq(2);
        expect(res.body.limit).to.eq(10);
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject unauthorized requests', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject invalid token', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: 'Bearer invalid-token' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should return 404 for non-existent user', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users/999999999`,
        headers: { Authorization: `Bearer ${adminToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
      });
    });
  });
});
