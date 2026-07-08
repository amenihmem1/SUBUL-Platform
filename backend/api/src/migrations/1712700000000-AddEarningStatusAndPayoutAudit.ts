import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarningStatusAndPayoutAudit1712700000000 implements MigrationInterface {
  name = 'AddEarningStatusAndPayoutAudit1712700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // earning_status on redemptions (Phase 1: always 'validated')
    await queryRunner.query(
      `ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "earning_status" VARCHAR(16) NOT NULL DEFAULT 'validated'`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "validates_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pcr_earning_status" ON "promo_code_redemptions" ("earning_status")`,
    );

    // preferred_currency on commercial_profiles
    await queryRunner.query(
      `ALTER TABLE "commercial_profiles" ADD COLUMN IF NOT EXISTS "preferred_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR'`,
    );

    // audit columns on commission_payouts
    await queryRunner.query(
      `ALTER TABLE "commission_payouts" ADD COLUMN IF NOT EXISTS "points_deducted" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_payouts" ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_payouts" ADD COLUMN IF NOT EXISTS "exchange_rate_source" VARCHAR(32) DEFAULT 'admin_manual'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commission_payouts" DROP COLUMN IF EXISTS "exchange_rate_source"`);
    await queryRunner.query(`ALTER TABLE "commission_payouts" DROP COLUMN IF EXISTS "exchange_rate"`);
    await queryRunner.query(`ALTER TABLE "commission_payouts" DROP COLUMN IF EXISTS "points_deducted"`);
    await queryRunner.query(`ALTER TABLE "commercial_profiles" DROP COLUMN IF EXISTS "preferred_currency"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "validates_at"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "earning_status"`);
  }
}
