import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes commission-based system and replaces with referral-based points.
 * - Drops commission_type and commission_value from commercial_profiles
 * - Adds total_referrals and last_reward_milestone tracking columns
 */
export class RemoveCommissionAddReferralPoints1712900000000 implements MigrationInterface {
  name = 'RemoveCommissionAddReferralPoints1712900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove commission columns
    await queryRunner.query(`
      ALTER TABLE commercial_profiles
      DROP COLUMN IF EXISTS commission_type,
      DROP COLUMN IF EXISTS commission_value
    `);

    // Add referral tracking columns
    await queryRunner.query(`
      ALTER TABLE commercial_profiles
      ADD COLUMN IF NOT EXISTS total_referrals INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_reward_milestone INT NOT NULL DEFAULT 0
    `);

    // Remove commission_amount_cents from promo_code_redemptions (keep column but set to null)
    await queryRunner.query(`
      UPDATE promo_code_redemptions SET commission_amount_cents = NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore commission columns
    await queryRunner.query(`
      ALTER TABLE commercial_profiles
      ADD COLUMN IF NOT EXISTS commission_type VARCHAR(16) DEFAULT 'percentage',
      ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10,2) DEFAULT 10
    `);

    // Remove referral tracking columns
    await queryRunner.query(`
      ALTER TABLE commercial_profiles
      DROP COLUMN IF EXISTS total_referrals,
      DROP COLUMN IF EXISTS last_reward_milestone
    `);
  }
}
