import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralCodesTable1713600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table if it does not exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_codes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" integer NOT NULL UNIQUE,
        "code" character varying(16) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // Index on user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referral_codes_user_id"
      ON "referral_codes" ("user_id")
    `);

    // Index on code
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_referral_codes_code"
      ON "referral_codes" ("code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_codes"`);
  }
}

