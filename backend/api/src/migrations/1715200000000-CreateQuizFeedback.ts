import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizFeedback1715200000000 implements MigrationInterface {
  name = 'CreateQuizFeedback1715200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE quiz_feedback (
        id              SERIAL PRIMARY KEY,
        user_id         INT REFERENCES users(id) ON DELETE SET NULL,
        course_id       VARCHAR(255),
        module_title    VARCHAR(500),
        question_text   TEXT NOT NULL,
        question_type   VARCHAR(20) DEFAULT 'qcm',
        correct_answer  VARCHAR(10),
        reason          VARCHAR(50) DEFAULT 'off_topic',
        comment         TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_qf_status ON quiz_feedback(status)`);
    await queryRunner.query(`CREATE INDEX idx_qf_course ON quiz_feedback(course_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quiz_feedback`);
  }
}
