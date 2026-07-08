import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * US Premium was incorrectly seeded with EU cent amounts as USD ($79.99/mo).
 * Standard US stays $9.99/mo; Premium is aligned to ~1.6× monthly with same -10% / -30% as EU tier.
 */
export class UpdateUsPremiumPlanBilling1713800000000 implements MigrationInterface {
  name = 'UpdateUsPremiumPlanBilling1713800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "plan_billing_options" AS o
      SET
        "price_cents" = v."price_cents",
        "discount_text" = v."discount_text"
      FROM "subscription_plans" AS p,
      (VALUES
        ('monthly'::varchar, 1599::int, NULL::varchar),
        ('quarterly'::varchar, 4317::int, '-10%'::varchar),
        ('annual'::varchar, 13432::int, '-30%'::varchar)
      ) AS v("cycle", "price_cents", "discount_text")
      WHERE o."plan_id" = p."id"
        AND p."slug" = 'premium'
        AND o."region" = 'US'
        AND o."cycle" = v."cycle"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "plan_billing_options" AS o
      SET
        "price_cents" = v."price_cents",
        "discount_text" = v."discount_text"
      FROM "subscription_plans" AS p,
      (VALUES
        ('monthly'::varchar, 7999::int, NULL::varchar),
        ('quarterly'::varchar, 21599::int, '-10%'::varchar),
        ('annual'::varchar, 66999::int, '-30%'::varchar)
      ) AS v("cycle", "price_cents", "discount_text")
      WHERE o."plan_id" = p."id"
        AND p."slug" = 'premium'
        AND o."region" = 'US'
        AND o."cycle" = v."cycle"
    `);
  }
}
