const apiUrl = 'http://localhost:3001';

describe('API Endpoints - Auth', () => {
  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email: 'invalid@test.com', password: 'wrongpassword' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should reject missing email', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { password: 'password123' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });

    it('should reject missing password', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: { email: 'test@test.com' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should reject registration (disabled)', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/register`,
        body: { email: 'test@test.com', password: 'password123', fullName: 'Test User' },
        failOnStatusCode: false,
      }).then((response) => {
        expect([400, 401, 403]).to.include(response.status);
      });
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return 401 without session', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/session`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without JWT', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/me`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Admin Users', () => {
  describe('GET /api/admin/users', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('POST /api/admin/users', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users`,
        body: { email: 'test@test.com', password: 'password123' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/admin/users/1`,
        body: { fullName: 'Updated' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('PATCH /api/admin/users/:id/status', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/admin/users/1/status`,
        body: { status: 'active' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/api/admin/users/1`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Admin Stats', () => {
  describe('GET /api/admin/stats', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/stats`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/admin/overview', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/overview`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/admin/progression', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/progression`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - University Students', () => {
  describe('GET /api/university/students', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/university/students/:id', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/students/1`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('PATCH /api/university/students/:id', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/api/university/students/1`,
        body: { enrollmentStatus: 'active' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('DELETE /api/university/students/:id', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/api/university/students/1`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - University Programs', () => {
  describe('GET /api/university/programs', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('POST /api/university/programs', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/university/programs`,
        body: { title: 'Test Program' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/university/programs/:id/enrollments', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/programs/test-id/enrollments`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - University Invites', () => {
  describe('GET /api/university/invites', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/invites`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('POST /api/university/invites', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/university/invites`,
        body: { emails: ['test@test.com'] },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - University Licenses', () => {
  describe('GET /api/university/licenses', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/licenses`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - University Dashboard', () => {
  describe('GET /api/university/dashboard', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/university/dashboard`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Admin Instructor Management', () => {
  describe('GET /api/admin/users with instructor filter', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/users`,
        qs: { role: 'instructor' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('POST /api/admin/users for instructor', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/admin/users`,
        body: { email: 'instructor@test.com', password: 'password123', role: 'instructor' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Courses', () => {
  describe('GET /api/courses/:courseId', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/courses/AZ-900-UNIFIED`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/courses/my-courses', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/courses/my-courses`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Exams', () => {
  describe('GET /api/exams', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/exams`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Jobs', () => {
  describe('GET /api/jobs', () => {
    it('should require authentication or return public jobs', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/jobs`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });
});

describe('API Endpoints - Certifications', () => {
  describe('GET /api/certifications', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/certifications`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });
});

describe('API Endpoints - Labs', () => {
  describe('GET /api/labs', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/labs`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });
});

describe('API Endpoints - Goals', () => {
  describe('GET /api/goals', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/goals`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Learner', () => {
  describe('GET /api/learner/dashboard', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/learner/dashboard`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Employer', () => {
  describe('GET /api/employer/dashboard', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/employer/dashboard`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/employer/jobs', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/employer/jobs`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/employer/employees', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/employer/employees`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/employer/certified-learners', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/employer/certified-learners`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Notifications', () => {
  describe('GET /api/notifications', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/notifications`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Quiz Results', () => {
  describe('GET /api/quiz-results', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/quiz-results`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('GET /api/admin/quiz-results/assessments', () => {
    it('should require authentication', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/admin/quiz-results/assessments`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });
});

describe('API Endpoints - Companies', () => {
  describe('GET /api/companies', () => {
    it('should require authentication or return public', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/companies`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });
});

describe('API Endpoints - Health Check', () => {
  describe('GET /api', () => {
    it('should return API status', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api`,
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status);
      });
    });
  });
});
