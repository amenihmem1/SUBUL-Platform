import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin create-university sends human-readable country; VARCHAR(4) only fits ISO-ish codes.
 */
export class WidenUniversityCountryColumn1714100000000 implements MigrationInterface {
  name = 'WidenUniversityCountryColumn1714100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "universities"
      ALTER COLUMN "country" TYPE VARCHAR(128)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "universities"
      SET "country" = LEFT("country", 4)
      WHERE "country" IS NOT NULL AND LENGTH("country") > 4
    `);
    await queryRunner.query(`
      ALTER TABLE "universities"
      ALTER COLUMN "country" TYPE VARCHAR(4)
    `);
  }
}
