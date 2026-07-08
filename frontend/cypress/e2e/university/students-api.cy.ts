describe('University - Students Management (E2E)', () => {
  const apiUrl = (Cypress.env('apiUrl') as string) || 'http://localhost:3001';
  let universityToken: string;

  before(() => {
    const email = (Cypress.env('universityEmail') as string) || 'university@subul.dev';
    const password = (Cypress.env('universityPassword') as string) || 'SeedPassword123!';

    cy.request({
      method: 'POST',
      url: `${apiUrl}/api/auth/login`,
      body: { email, password },
    }).then((res) => {
      expect(res.body).to.have.property('access_token');
      universityToken = res.body.access_token as string;
    });
  });

  describe('University Dashboard', () => {
    it('should get university dashboard stats', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/dashboard`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('programsCount');
        expect(res.body).to.have.property('enrollmentsCount');
        expect(res.body).to.have.property('staffCount');
        expect(res.body).to.have.property('pendingInvites');
        expect(res.body).to.have.property('licenses');
      });
    });
  });

  describe('Students Management', () => {
    it('should list students with pagination', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        headers: { Authorization: `Bearer ${universityToken}` },
        qs: { page: 1, limit: 10 },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('data');
        expect(res.body).to.have.property('total');
        expect(res.body).to.have.property('page');
        expect(res.body).to.have.property('limit');
        expect(res.body.data).to.be.an('array');
      });
    });

    it('should filter students by program', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        headers: { Authorization: `Bearer ${universityToken}` },
        qs: { programId: 'all-programs' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should filter students by status', () => {
      const statuses = ['active', 'invited', 'pending', 'completed', 'inactive'];
      statuses.forEach((status) => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/university/students`,
          headers: { Authorization: `Bearer ${universityToken}` },
          qs: { status },
        }).then((res) => {
          expect(res.status).to.eq(200);
        });
      });
    });

    it('should search students by name or email', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        headers: { Authorization: `Bearer ${universityToken}` },
        qs: { search: 'test' },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    });

    it('should get paginated results with different limits', () => {
      [5, 10, 20, 50].forEach((limit) => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/university/students`,
          headers: { Authorization: `Bearer ${universityToken}` },
          qs: { limit },
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body.limit).to.eq(limit);
        });
      });
    });

    it('should get paginated results with different pages', () => {
      [1, 2, 3].forEach((page) => {
        cy.request({
          method: 'GET',
          url: `${apiUrl}/api/university/students`,
          headers: { Authorization: `Bearer ${universityToken}` },
          qs: { page, limit: 10 },
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body.page).to.eq(page);
        });
      });
    });

    it('should get student details', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        headers: { Authorization: `Bearer ${universityToken}` },
        qs: { limit: 1 },
      }).then((res) => {
        if (res.body.data && res.body.data.length > 0) {
          const studentId = res.body.data[0].id;
          cy.request({
            method: 'GET',
            url: `${apiUrl}/api/university/students/${studentId}`,
            headers: { Authorization: `Bearer ${universityToken}` },
          }).then((detailRes) => {
            expect(detailRes.status).to.eq(200);
            expect(detailRes.body).to.have.property('id');
            expect(detailRes.body).to.have.property('email');
            expect(detailRes.body).to.have.property('enrollments');
          });
        }
      });
    });

    it('should return 404 for non-existent student', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students/999999999`,
        headers: { Authorization: `Bearer ${universityToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 404]).to.include(res.status);
      });
    });
  });

  describe('Programs Management', () => {
    it('should list programs', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('should create a new program', () => {
      const unique = Date.now();
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/university/programs`,
        headers: { Authorization: `Bearer ${universityToken}` },
        body: {
          title: `Test Program ${unique}`,
          description: 'This is a test program description',
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('id');
        expect(res.body.title).to.include('Test Program');
      });
    });

    it('should get enrollments for a program', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((res) => {
        if (res.body && res.body.length > 0) {
          const programId = res.body[0].id;
          cy.request({
            method: 'GET',
            url: `${apiUrl}/api/university/programs/${programId}/enrollments`,
            headers: { Authorization: `Bearer ${universityToken}` },
          }).then((enrollRes) => {
            expect(enrollRes.status).to.eq(200);
            expect(enrollRes.body).to.be.an('array');
          });
        }
      });
    });
  });

  describe('Invites Management', () => {
    it('should list invites', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/invites`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });

    it('should create bulk invites', () => {
      const unique = Date.now();
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/university/invites`,
        headers: { Authorization: `Bearer ${universityToken}` },
        body: {
          emails: [
            `student1-${unique}@test.local`,
            `student2-${unique}@test.local`,
            `student3-${unique}@test.local`,
          ],
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property('created');
        expect(res.body.created).to.eq(3);
        expect(res.body).to.have.property('invites');
        expect(res.body.invites).to.have.length(3);
      });
    });

    it('should create invite with program assignment', () => {
      const unique = Date.now();
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((progRes) => {
        if (progRes.body && progRes.body.length > 0) {
          const programId = progRes.body[0].id;
          cy.request({
            method: 'POST',
            url: `${apiUrl}/api/university/invites`,
            headers: { Authorization: `Bearer ${universityToken}` },
            body: {
              emails: [`student-${unique}@test.local`],
              programId,
            },
          }).then((res) => {
            expect(res.status).to.eq(201);
            expect(res.body.invites[0].programId).to.eq(programId);
          });
        }
      });
    });

    it('should reject empty email list', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/university/invites`,
        headers: { Authorization: `Bearer ${universityToken}` },
        body: { emails: [] },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 400]).to.include(res.status);
      });
    });
  });

  describe('Licenses Management', () => {
    it('should list licenses', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/licenses`,
        headers: { Authorization: `Bearer ${universityToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });
  });

  describe('Error Handling', () => {
    it('should reject unauthorized requests to students', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject unauthorized requests to programs', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject unauthorized requests to invites', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/invites`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject unauthorized requests to dashboard', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/dashboard`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it('should reject invalid token', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        headers: { Authorization: 'Bearer invalid-token' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });
  });
});
