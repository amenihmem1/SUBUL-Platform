import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonTranslations1714800000000 implements MigrationInterface {
  name = 'CreateLessonTranslations1714800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lesson_translations" (
        "id"               SERIAL                NOT NULL,
        "lesson_id"        integer               NOT NULL,
        "locale"           character varying(10) NOT NULL,
        "title"            character varying(255),
        "content"          text,
        "bullets"          json,
        "analogy"          text,
        "comparison_table" json,
        "created_at"       TIMESTAMP             NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "uq_lesson_locale"           UNIQUE ("lesson_id", "locale"),
        CONSTRAINT "pk_lesson_translations"     PRIMARY KEY ("id"),
        CONSTRAINT "fk_lesson_translations_lesson"
          FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lesson_translations_lesson_locale"
        ON "lesson_translations" ("lesson_id", "locale")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lesson_translations_lesson_locale"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_translations"`);
  }
}
