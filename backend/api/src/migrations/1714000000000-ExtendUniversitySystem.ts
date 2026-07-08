import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendUniversitySystem1714000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    /* ── 1. Extend universities ── */
    await runner.query(`
      ALTER TABLE universities
        ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS logo VARCHAR(512),
        ADD COLUMN IF NOT EXISTS website VARCHAR(255),
        ADD COLUMN IF NOT EXISTS country VARCHAR(4),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS contract_start_date DATE,
        ADD COLUMN IF NOT EXISTS contract_end_date DATE,
        ADD COLUMN IF NOT EXISTS setup_token VARCHAR(128) UNIQUE,
        ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
        ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN NOT NULL DEFAULT FALSE
    `);

    /* ── 2. university_departments ── */
    await runner.query(`
      CREATE TABLE IF NOT EXISTS university_departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_dept_uni ON university_departments(university_id)`);

    /* ── 3. university_cohorts ── */
    await runner.query(`
      CREATE TABLE IF NOT EXISTS university_cohorts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        department_id UUID REFERENCES university_departments(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        plan_slug VARCHAR(64),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_cohort_uni ON university_cohorts(university_id)`);

    /* ── 4. university_memberships ── */
    await runner.query(`
      CREATE TABLE IF NOT EXISTS university_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL DEFAULT 'student',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        department_id UUID REFERENCES university_departments(id) ON DELETE SET NULL,
        cohort_id UUID REFERENCES university_cohorts(id) ON DELETE SET NULL,
        invited_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        joined_at TIMESTAMP WITHOUT TIME ZONE,
        removed_at TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (university_id, user_id)
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_mem_uni ON university_memberships(university_id)`);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_mem_user ON university_memberships(user_id)`);

    /* ── 5. Extend university_invites ── */
    await runner.query(`
      ALTER TABLE university_invites
        ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'student',
        ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES university_departments(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES university_cohorts(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS resend_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMP WITHOUT TIME ZONE
    `);

    /* ── 6. Extend university_licenses ── */
    await runner.query(`
      ALTER TABLE university_licenses
        ADD COLUMN IF NOT EXISTS license_key VARCHAR(64) UNIQUE,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS price_cents INTEGER,
        ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
        ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS renewed_from UUID REFERENCES university_licenses(id) ON DELETE SET NULL
    `);

    /* ── 7. university_audit_logs ── */
    await runner.query(`
      CREATE TABLE IF NOT EXISTS university_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(128) NOT NULL,
        action VARCHAR(128) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(64),
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_audit_uni ON university_audit_logs(university_id)`);
    await runner.query(`CREATE INDEX IF NOT EXISTS idx_uni_audit_entity ON university_audit_logs(entity_type, entity_id)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS university_audit_logs`);
    await runner.query(`DROP TABLE IF EXISTS university_memberships`);
    await runner.query(`ALTER TABLE university_invites
      DROP COLUMN IF EXISTS role,
      DROP COLUMN IF EXISTS department_id,
      DROP COLUMN IF EXISTS cohort_id,
      DROP COLUMN IF EXISTS invited_by,
      DROP COLUMN IF EXISTS resend_count,
      DROP COLUMN IF EXISTS last_resent_at`);
    await runner.query(`ALTER TABLE university_licenses
      DROP COLUMN IF EXISTS license_key,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS price_cents,
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS auto_renew,
      DROP COLUMN IF EXISTS renewed_from`);
    await runner.query(`DROP TABLE IF EXISTS university_cohorts`);
    await runner.query(`DROP TABLE IF EXISTS university_departments`);
    await runner.query(`ALTER TABLE universities
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS logo,
      DROP COLUMN IF EXISTS website,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS phone,
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS contract_start_date,
      DROP COLUMN IF EXISTS contract_end_date,
      DROP COLUMN IF EXISTS setup_token,
      DROP COLUMN IF EXISTS setup_token_expires_at,
      DROP COLUMN IF EXISTS is_setup_complete`);
  }
}
