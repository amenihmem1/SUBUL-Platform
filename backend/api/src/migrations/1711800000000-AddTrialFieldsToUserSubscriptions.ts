import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrialFieldsToUserSubscriptions1711800000000 implements MigrationInterface {
  name = 'AddTrialFieldsToUserSubscriptions1711800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "trial_start_date" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "trial_end_date" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "is_trial_used" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "subscription_status" character varying(32)`,
    );
    const hasStatusColumn = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user_subscriptions' and column_name='status'
    `);

    if (hasStatusColumn && hasStatusColumn.length > 0) {
      await queryRunner.query(
        `UPDATE "user_subscriptions" SET "subscription_status" = COALESCE("subscription_status", "status", 'active')`,
      );
    } else {
      await queryRunner.query(
        `UPDATE "user_subscriptions" SET "subscription_status" = COALESCE("subscription_status", 'active')`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ALTER COLUMN "subscription_status" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ALTER COLUMN "subscription_status" SET DEFAULT 'trial'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "status"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `UPDATE "user_subscriptions" SET "status" = COALESCE("subscription_status", 'active')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "subscription_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "is_trial_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "trial_end_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "trial_start_date"`,
    );
  }
}
