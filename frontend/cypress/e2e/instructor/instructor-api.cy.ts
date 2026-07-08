describe('Instructor - Management (E2E)', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  let adminToken: string;

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

  describe('Instructor User Management (via Admin)', () => {
    it('should filter users by instructor role', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
        res.body.data.forEach((user: any) => {
          expect(user.role).to.eq('instructor');
        });
      });
    });

    it('should list all instructor users with pagination', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', page: 1, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.page).to.eq(1);
        expect(res.body.limit).to.eq(10);
      });
    });

    it('should search instructors by name or email', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', search: 'instructor' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should filter instructors by status', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', status: 'active' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        res.body.data.forEach((user: any) => {
          expect(user.status).to.eq('active');
        });
      });
    });
  });

  describe('Instructor CRUD Operations', () => {
    const unique = Date.now();
    const testEmail = `instructor-${unique}@test.local`;

    it('should create a new instructor', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          fullName: `Test Instructor ${unique}`,
          email: testEmail,
          password: 'InstructorPass123!',
          role: 'instructor',
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id');
        expect(res.body.email).to.eq(testEmail);
        expect(res.body.role).to.eq('instructor');
      });
    });

    it('should get instructor details', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const instructorId = res.body.data[0].id;
          cy.request({
            method: 'GET',
            url: `${apiUrl}/api/admin/users/${instructorId}`,
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((detailRes) => {
            expect(detailRes.status).to.eq(200);
            expect(detailRes.body).to.have.property('id');
            expect(detailRes.body).to.have.property('email');
            expect(detailRes.body).to.have.property('role');
          });
        }
      });
    });

    it('should update instructor profile', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const instructorId = res.body.data[0].id;
          cy.request({
            method: 'PATCH',
            url: `${apiUrl}/api/admin/users/${instructorId}`,
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              fullName: `Updated Instructor ${unique}`,
            },
          }).then((updateRes) => {
            expect(updateRes.status).to.eq(200);
          });
        }
      });
    });

    it('should change instructor status', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', status: 'active', limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const instructorId = res.body.data[0].id;
          cy.request({
            method: 'PATCH',
            url: `${apiUrl}/api/admin/users/${instructorId}/status`,
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { status: 'inactive' },
          }).then((statusRes) => {
            expect(statusRes.status).to.eq(200);
            expect(statusRes.body.status).to.eq('inactive');
          });
        }
      });
    });

    it('should approve instructor', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', status: 'pending', limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const instructorId = res.body.data[0].id;
          cy.request({
            method: 'POST',
            url: `${apiUrl}/api/admin/users/${instructorId}/approve`,
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((approveRes) => {
            expect(approveRes.status).to.eq(200);
            expect(approveRes.body.status).to.eq('active');
          });
        }
      });
    });

    it('should set instructor password', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { role: 'instructor', limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const instructorId = res.body.data[0].id;
          cy.request({
            method: 'PATCH',
            url: `${apiUrl}/api/admin/users/${instructorId}/password`,
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { password: 'NewInstructorPass123!' },
          }).then((pwdRes) => {
            expect(pwdRes.status).to.eq(200);
          });
        }
      });
    });
  });

  describe('All User Roles Management', () => {
    const roles = [
      { key: 'learner', label: 'Learner' },
      { key: 'student', label: 'Student' },
      { key: 'admin', label: 'Admin' },
      { key: 'employer', label: 'Employer' },
      { key: 'instructor', label: 'Instructor' },
      { key: 'university', label: 'University' },
    ];

    roles.forEach((role) => {
      it(`should list all ${role.label} users`, () => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/admin/users`,
          headers: { Authorization: `Bearer ${adminToken}` },
          qs: { role: role.key, limit: 5 },
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.be.an('array');
        });
      });

      it(`should create a new ${role.label}`, () => {
        const unique = Date.now();
        cy.request({
          method: 'POST',
          url: `${apiUrl}/api/admin/users`,
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            fullName: `Test ${role.label} ${unique}`,
            email: `test-${role.key}-${unique}@test.local`,
            password: 'TestPassword123!',
            role: role.key,
          },
        }).then((res) => {
          expect(res.status).to.eq(201);
          expect(res.body).to.have.property('id');
          expect(res.body.role).to.eq(role.key);
        });
      });
    });
  });

  describe('Quiz Results (for Instructors)', () => {
    it('should get assessment results for admin', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/quiz-results/assessments`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { page: 1, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('data');
      });
    });

    it('should get quiz level results for admin', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/quiz-results/quiz-levels`,
        headers: { Authorization: `Bearer ${adminToken}` },
        qs: { page: 1, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('data');
      });
    });
  });

  describe('Analytics Overview', () => {
    it('should get analytics overview', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/analytics/overview`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  describe('Agent Usage (for Instructors)', () => {
    it('should get agent usage stats', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/agent-usage`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should get agent limits', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/settings/agent-limits`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject unauthorized access to admin users', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject unauthorized access to instructor creation', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users`,
        body: {
          fullName: 'Unauthorized Instructor',
          email: 'unauthorized@test.local',
          password: 'TestPassword123!',
          role: 'instructor',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject unauthorized access to analytics', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/analytics/overview`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });
  });
});
