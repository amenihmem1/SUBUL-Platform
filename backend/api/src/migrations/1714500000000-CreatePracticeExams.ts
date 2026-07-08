import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePracticeExams1714500000000 implements MigrationInterface {
  name = 'CreatePracticeExams1714500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_exams" (
        "id" SERIAL PRIMARY KEY,
        "slug" varchar(120) NOT NULL UNIQUE,
        "certification_id" integer NULL REFERENCES "certifications"("id") ON DELETE SET NULL,
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "duration_minutes" integer NOT NULL DEFAULT 60,
        "passing_score" integer NOT NULL DEFAULT 70,
        "difficulty" varchar(20) NOT NULL DEFAULT 'beginner',
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "external_id" varchar(120) NULL,
        "source" varchar(64) NULL,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "azure_search_indexed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_exams_certification_id"
      ON "practice_exams" ("certification_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_exams_status"
      ON "practice_exams" ("status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_exam_questions" (
        "id" SERIAL PRIMARY KEY,
        "practice_exam_id" integer NOT NULL REFERENCES "practice_exams"("id") ON DELETE CASCADE,
        "external_id" varchar(120) NULL,
        "question_order" integer NOT NULL DEFAULT 0,
        "prompt" text NOT NULL,
        "options" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "correct" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "explanation" text NULL,
        "domain" varchar(120) NULL,
        "difficulty" varchar(20) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_exam_questions_exam_id"
      ON "practice_exam_questions" ("practice_exam_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_practice_exam_questions_unique_order"
      ON "practice_exam_questions" ("practice_exam_id", "question_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exam_questions_unique_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exam_questions_exam_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "practice_exam_questions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exams_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_exams_certification_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "practice_exams"`);
  }
}
