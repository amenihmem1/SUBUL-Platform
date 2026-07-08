import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenCheckoutIntegrityIndexes1711900000000 implements MigrationInterface {
  name = 'HardenCheckoutIntegrityIndexes1711900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_subscriptions_user_created_at" ON "user_subscriptions" ("user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payment_transactions_provider_payment_intent_id" ON "payment_transactions" ("provider_payment_intent_id") WHERE "provider_payment_intent_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_promo_code_redemptions_payment_transaction_id" ON "promo_code_redemptions" ("payment_transaction_id") WHERE "payment_transaction_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_promo_code_redemptions_payment_transaction_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_payment_transactions_provider_payment_intent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_subscriptions_user_created_at"`);
  }
}
