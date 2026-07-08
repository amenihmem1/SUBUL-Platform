import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommercialPointsSystem1712800000000 implements MigrationInterface {
  name = 'AddCommercialPointsSystem1712800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add points_balance column to commercial_profiles
    await queryRunner.query(`
      ALTER TABLE commercial_profiles
      ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0
    `);

    // Create commercial_points_ledger table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS commercial_points_ledger (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        commercial_id UUID NOT NULL REFERENCES commercial_profiles(id) ON DELETE CASCADE,
        points_change INT NOT NULL,
        balance_after INT NOT NULL,
        type VARCHAR(16) NOT NULL,
        source VARCHAR(32) NOT NULL,
        source_id UUID,
        description TEXT,
        eur_cents_equivalent INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for efficient queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_points_ledger_commercial_id
      ON commercial_points_ledger(commercial_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_points_ledger_commercial_type
      ON commercial_points_ledger(commercial_id, type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_points_ledger_commercial_created
      ON commercial_points_ledger(commercial_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_points_ledger_commercial_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_points_ledger_commercial_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_points_ledger_commercial_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS commercial_points_ledger`);
    await queryRunner.query(`ALTER TABLE commercial_profiles DROP COLUMN IF EXISTS points_balance`);
  }
}
