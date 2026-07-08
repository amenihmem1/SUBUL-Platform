import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommercialAffiliateSystem1712600000000 implements MigrationInterface {
  name = 'AddCommercialAffiliateSystem1712600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Commercial profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commercial_profiles" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"          INTEGER NOT NULL,
        "commission_type"  VARCHAR(16) NOT NULL DEFAULT 'percentage',
        "commission_value" DECIMAL(10,2) NOT NULL DEFAULT 10,
        "status"           VARCHAR(16) NOT NULL DEFAULT 'active',
        "notes"            TEXT,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commercial_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_commercial_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_commercial_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commercial_profiles_user_id" ON "commercial_profiles" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commercial_profiles_status" ON "commercial_profiles" ("status")`);

    // 2. Commission payouts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_payouts" (
        "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
        "commercial_id"   UUID NOT NULL,
        "amount_cents"    INTEGER NOT NULL,
        "currency"        VARCHAR(3) NOT NULL DEFAULT 'EUR',
        "status"          VARCHAR(16) NOT NULL DEFAULT 'pending',
        "notes"           TEXT,
        "paid_at"         TIMESTAMP,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_payouts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commission_payouts_commercial" FOREIGN KEY ("commercial_id") REFERENCES "commercial_profiles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_payouts_commercial_id" ON "commission_payouts" ("commercial_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_payouts_status" ON "commission_payouts" ("status")`);

    // 3. Add commercial_id to promo_codes
    await queryRunner.query(`ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "commercial_id" UUID`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_promo_codes_commercial_id" ON "promo_codes" ("commercial_id")`);

    // 4. Add commission fields to promo_code_redemptions
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "original_amount_cents" INTEGER`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "final_amount_cents" INTEGER`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3)`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "commission_amount_cents" INTEGER`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "commercial_id" UUID`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "commission_paid" BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "commission_paid_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(32)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_promo_code_redemptions_commercial_id" ON "promo_code_redemptions" ("commercial_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove commission fields from redemptions
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "payment_status"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "commission_paid_at"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "commission_paid"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "commercial_id"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "commission_amount_cents"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "final_amount_cents"`);
    await queryRunner.query(`ALTER TABLE "promo_code_redemptions" DROP COLUMN IF EXISTS "original_amount_cents"`);

    // Remove commercial_id from promo_codes
    await queryRunner.query(`ALTER TABLE "promo_codes" DROP COLUMN IF EXISTS "commercial_id"`);

    // Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commercial_profiles"`);
  }
}
