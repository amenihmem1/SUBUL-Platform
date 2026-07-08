import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexerDocumentMetrics1714700000000
  implements MigrationInterface
{
  name = 'AddIndexerDocumentMetrics1714700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['courses', 'labs', 'certifications']) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "azure_search_document_count" integer NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "azure_search_last_error" text NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['courses', 'labs', 'certifications']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "azure_search_last_error"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "azure_search_document_count"`,
      );
    }
  }
}
