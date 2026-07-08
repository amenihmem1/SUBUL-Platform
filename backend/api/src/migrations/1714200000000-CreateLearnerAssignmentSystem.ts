import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLearnerAssignmentSystem1714200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS learner_content_assignments (
        id            SERIAL PRIMARY KEY,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type  VARCHAR(20) NOT NULL CHECK (content_type IN ('course','lab','certification')),
        content_ref   VARCHAR(255) NOT NULL,
        granted_by    INT REFERENCES users(id) ON DELETE SET NULL,
        granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMPTZ,
        note          TEXT,
        UNIQUE(user_id, content_type, content_ref)
      )
    `);

    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_lca_user
        ON learner_content_assignments(user_id)
    `);

    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_lca_type_ref
        ON learner_content_assignments(content_type, content_ref)
    `);

    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_lca_expires
        ON learner_content_assignments(expires_at)
        WHERE expires_at IS NOT NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS learner_content_assignments`);
  }
}
