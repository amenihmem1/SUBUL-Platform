import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorSubscriptionPlans1712400000000 implements MigrationInterface {
  name = 'RefactorSubscriptionPlans1712400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns to subscription_plans
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "type" character varying(32) NOT NULL DEFAULT 'standard'`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "visibility" character varying(32) NOT NULL DEFAULT 'public'`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "sort_order" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "badge_text" character varying(128)`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "theme_color" character varying(64)`);

    // 2. Create plan_billing_options table
    await queryRunner.query(`
      CREATE TABLE "plan_billing_options" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_id" uuid NOT NULL,
        "region" character varying(16) NOT NULL DEFAULT 'DEFAULT',
        "cycle" character varying(32) NOT NULL,
        "price_cents" integer NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "discount_text" character varying(128),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_billing_options_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE "plan_billing_options"
      ADD CONSTRAINT "FK_plan_billing_options_plan_id"
      FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 3. Migrate existing data: Move priceCents, currency, interval to a new billing option
    await queryRunner.query(`
      INSERT INTO "plan_billing_options" ("plan_id", "region", "cycle", "price_cents", "currency")
      SELECT "id", 'DEFAULT', "interval", "price_cents", "currency"
      FROM "subscription_plans"
      WHERE "price_cents" IS NOT NULL AND "interval" IS NOT NULL
    `);

    // 4. Drop old columns
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "price_cents"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "currency"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "interval"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add old columns
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "interval" character varying(20) NOT NULL DEFAULT 'month'`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "currency" character varying(3) NOT NULL DEFAULT 'EUR'`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD "price_cents" integer NOT NULL DEFAULT 0`);

    // Reverse migration of data: take the first 'DEFAULT' option as the fallback
    await queryRunner.query(`
      UPDATE "subscription_plans" sp
      SET 
        "price_cents" = pbo."price_cents",
        "currency" = pbo."currency",
        "interval" = pbo."cycle"
      FROM (
        SELECT "plan_id", "price_cents", "currency", "cycle", 
               ROW_NUMBER() OVER(PARTITION BY "plan_id" ORDER BY "created_at" ASC) as rn
        FROM "plan_billing_options"
      ) pbo
      WHERE sp."id" = pbo."plan_id" AND pbo.rn = 1
    `);

    // 2. Drop foreign key and table
    await queryRunner.query(`ALTER TABLE "plan_billing_options" DROP CONSTRAINT "FK_plan_billing_options_plan_id"`);
    await queryRunner.query(`DROP TABLE "plan_billing_options"`);

    // 3. Drop new columns
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "theme_color"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "badge_text"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "sort_order"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "visibility"`);
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "type"`);
  }
}
