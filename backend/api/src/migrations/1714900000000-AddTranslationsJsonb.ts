import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTranslationsJsonb1714900000000 implements MigrationInterface {
  name = 'AddTranslationsJsonb1714900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "labs" ADD COLUMN IF NOT EXISTS "translations" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "practice_exam_questions" ADD COLUMN IF NOT EXISTS "translations" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "practice_exam_questions" DROP COLUMN IF EXISTS "translations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "labs" DROP COLUMN IF EXISTS "translations"`,
    );
  }
}
