import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackContentIndexerSync1714400000000 implements MigrationInterface {
  name = 'TrackContentIndexerSync1714400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD COLUMN IF NOT EXISTS "azure_search_indexed_at" timestamp without time zone NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "labs"
      ADD COLUMN IF NOT EXISTS "azure_search_indexed_at" timestamp without time zone NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "certifications"
      ADD COLUMN IF NOT EXISTS "azure_search_indexed_at" timestamp without time zone NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "certifications" DROP COLUMN IF EXISTS "azure_search_indexed_at"`);
    await queryRunner.query(`ALTER TABLE "labs" DROP COLUMN IF EXISTS "azure_search_indexed_at"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "azure_search_indexed_at"`);
  }
}
