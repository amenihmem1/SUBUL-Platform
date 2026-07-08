import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseCompletionCertificates1715100000000 implements MigrationInterface {
  name = 'CreateCourseCompletionCertificates1715100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE course_completion_certificates (
        id           SERIAL PRIMARY KEY,
        user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id    INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        cert_hash    VARCHAR(32) NOT NULL UNIQUE,
        course_title VARCHAR(500) NOT NULL,
        issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_ccc_cert_hash ON course_completion_certificates(cert_hash)`);
    await queryRunner.query(`CREATE INDEX idx_ccc_user_id ON course_completion_certificates(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS course_completion_certificates`);
  }
}
