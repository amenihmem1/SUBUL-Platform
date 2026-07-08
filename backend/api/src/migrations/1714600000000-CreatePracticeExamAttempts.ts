import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePracticeExamAttempts1714600000000 implements MigrationInterface {
  name = 'CreatePracticeExamAttempts1714600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_exam_attempts" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "practice_exam_id" integer NOT NULL REFERENCES "practice_exams"("id") ON DELETE CASCADE,
        "score" decimal(5,2) NOT NULL,
        "status" varchar(16) NOT NULL,
        "correct_count" integer NOT NULL DEFAULT 0,
        "question_count" integer NOT NULL DEFAULT 0,
        "time_spent" varchar(32) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_exam_attempts_user"
      ON "practice_exam_attempts" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_exam_attempts_exam"
      ON "practice_exam_attempts" ("practice_exam_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exam_attempts_exam"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exam_attempts_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "practice_exam_attempts"`);
  }
}
