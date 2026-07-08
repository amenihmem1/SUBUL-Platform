import { MigrationInterface, QueryRunner } from 'typeorm';

const BILLING_SEED: Array<{
  slug: string;
  region: string;
  cycle: string;
  priceCents: number;
  currency: string;
  discountText: string | null;
}> = [
  { slug: 'standard', region: 'TN', cycle: 'monthly', priceCents: 49990, currency: 'TND', discountText: null },
  { slug: 'standard', region: 'TN', cycle: 'quarterly', priceCents: 134970, currency: 'TND', discountText: '-10%' },
  { slug: 'standard', region: 'TN', cycle: 'annual', priceCents: 419880, currency: 'TND', discountText: '-30%' },
  { slug: 'standard', region: 'EU', cycle: 'monthly', priceCents: 4999, currency: 'EUR', discountText: null },
  { slug: 'standard', region: 'EU', cycle: 'quarterly', priceCents: 13498, currency: 'EUR', discountText: '-10%' },
  { slug: 'standard', region: 'EU', cycle: 'annual', priceCents: 59988, currency: 'EUR', discountText: null },
  { slug: 'standard', region: 'US', cycle: 'monthly', priceCents: 999, currency: 'USD', discountText: null },
  { slug: 'standard', region: 'US', cycle: 'quarterly', priceCents: 2997, currency: 'USD', discountText: null },
  { slug: 'standard', region: 'US', cycle: 'annual', priceCents: 11988, currency: 'USD', discountText: null },
  { slug: 'premium', region: 'TN', cycle: 'monthly', priceCents: 79990, currency: 'TND', discountText: null },
  { slug: 'premium', region: 'TN', cycle: 'quarterly', priceCents: 215990, currency: 'TND', discountText: '-10%' },
  { slug: 'premium', region: 'TN', cycle: 'annual', priceCents: 669990, currency: 'TND', discountText: '-30%' },
  { slug: 'premium', region: 'EU', cycle: 'monthly', priceCents: 7999, currency: 'EUR', discountText: null },
  { slug: 'premium', region: 'EU', cycle: 'quarterly', priceCents: 21599, currency: 'EUR', discountText: '-10%' },
  { slug: 'premium', region: 'EU', cycle: 'annual', priceCents: 66999, currency: 'EUR', discountText: '-30%' },
  { slug: 'premium', region: 'US', cycle: 'monthly', priceCents: 1599, currency: 'USD', discountText: null },
  { slug: 'premium', region: 'US', cycle: 'quarterly', priceCents: 4317, currency: 'USD', discountText: '-10%' },
  { slug: 'premium', region: 'US', cycle: 'annual', priceCents: 13432, currency: 'USD', discountText: '-30%' },
];

/**
 * Idempotent migration: rename legacy free slug, ensure premium row exists,
 * and insert any missing `plan_billing_options` for standard/premium (code prices).
 */
export class SeedCorePricingPlans1713700000000 implements MigrationInterface {
  name = 'SeedCorePricingPlans1713700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "subscription_plans" SET "slug" = 'free' WHERE "slug" = 'basic'`);

    await queryRunner.query(`
      INSERT INTO "subscription_plans" ("name","slug","description","type","visibility","sort_order","badge_text","theme_color","features","is_active")
      SELECT 'Plan Premium','premium','Expérience complète: certifications, coaching carrière et support 24/7.','premium','public',3,'Le plus populaire','fuchsia','{}',true
      WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" p WHERE p.slug = 'premium')
    `);

    await queryRunner.query(`
      UPDATE "subscription_plans"
      SET "type" = 'premium', "visibility" = 'public', "name" = 'Plan Premium', "sort_order" = 3,
          "badge_text" = 'Le plus populaire', "theme_color" = 'fuchsia'
      WHERE "slug" = 'premium'
    `);

    for (const row of BILLING_SEED) {
      await queryRunner.query(
        `
        INSERT INTO "plan_billing_options" ("plan_id","region","cycle","price_cents","currency","discount_text","is_active")
        SELECT p.id, $1::varchar, $2::varchar, $3::int, $4::varchar, $5::varchar, true
        FROM "subscription_plans" p
        WHERE p.slug = $6
        AND NOT EXISTS (
          SELECT 1 FROM "plan_billing_options" o
          WHERE o.plan_id = p.id AND o.region = $1 AND o.cycle = $2
        )
        `,
        [row.region, row.cycle, row.priceCents, row.currency, row.discountText, row.slug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "subscription_plans" SET "slug" = 'basic' WHERE "slug" = 'free'`);
  }
}
