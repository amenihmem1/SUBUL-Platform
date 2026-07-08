/**
 * Clean + Seed: Commercial / Promo Code / Referral sample data
 *
 * - Deletes existing sample commercial data first
 * - Creates 3 commercials with accounts + profiles
 * - Creates 6 promo codes (2 per commercial)
 * - Creates 25 learner users who purchased plans using promo codes
 * - Creates payment transactions, subscriptions, and redemptions
 * - Updates commercial referral counts (no auto milestone points — admin converts manually)
 *
 * Usage: npm run seed:sample
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

/* ── helpers ── */
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const COMMERCIALS = [
  { email: 'ahmed.commercial@subul.test', name: 'Ahmed Ben Salem', password: 'Commercial123!' },
  { email: 'sara.commercial@subul.test', name: 'Sara Mansouri', password: 'Commercial123!' },
  { email: 'yassine.commercial@subul.test', name: 'Yassine Trabelsi', password: 'Commercial123!' },
];

const PROMO_CODES = [
  { code: 'AHMED15', discountType: 'percentage' as const, discountValue: 15 },
  { code: 'AHMED20', discountType: 'percentage' as const, discountValue: 20 },
  { code: 'SARA10', discountType: 'percentage' as const, discountValue: 10 },
  { code: 'SARA25', discountType: 'percentage' as const, discountValue: 25 },
  { code: 'YASSINE30', discountType: 'percentage' as const, discountValue: 30 },
  { code: 'YASSINE50', discountType: 'percentage' as const, discountValue: 50 },
];

const LEARNER_NAMES = [
  'Mohamed Ali', 'Fatma Bouazizi', 'Karim Jebali', 'Amira Saidi', 'Omar Hamdi',
  'Nour Chaabane', 'Rim Gharbi', 'Amine Belhaj', 'Ines Messaoudi', 'Taha Riahi',
  'Salma Khalil', 'Bassem Dridi', 'Maya Fakhfakh', 'Hichem Sassi', 'Rania Ayari',
  'Slim Marzouki', 'Eya Nasri', 'Wassim Kallel', 'Aya Zouari', 'Mehdi Rekik',
  'Lina Maalej', 'Anis Bouslama', 'Donia Gharbi', 'Youssef Triki', 'Meriam Haddad',
];

const BILLING_CYCLES: Array<'monthly' | 'quarterly' | 'annual'> = ['monthly', 'quarterly', 'annual'];
const COUNTRIES = [
  { code: 'TN', currency: 'TND', divisor: 1000, basePrice: 49.99 },
  { code: 'US', currency: 'USD', divisor: 100, basePrice: 9.99 },
  { code: 'EU', currency: 'EUR', divisor: 100, basePrice: 9.99 },
];

async function cleanData(dataSource: DataSource) {
  console.log('🧹 Cleaning existing sample data...');

  // Delete in reverse dependency order
  await dataSource.query(`DELETE FROM commercial_points_ledger WHERE commercial_id IN (SELECT id FROM commercial_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.commercial@subul.test'))`);
  await dataSource.query(`DELETE FROM user_subscriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'learner.%@subul.test')`);
  await dataSource.query(`DELETE FROM payment_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'learner.%@subul.test')`);
  await dataSource.query(`DELETE FROM promo_code_redemptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'learner.%@subul.test')`);
  await dataSource.query(`DELETE FROM promo_codes WHERE commercial_id IN (SELECT id FROM commercial_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.commercial@subul.test'))`);
  await dataSource.query(`DELETE FROM commercial_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.commercial@subul.test')`);
  await dataSource.query(`DELETE FROM users WHERE email LIKE '%.commercial@subul.test' OR email LIKE 'learner.%@subul.test'`);

  console.log('  ✅ Cleaned commercial profiles, promo codes, learners, and related data');
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('🌱 Seeding commercial / promo code / referral sample data...\n');

    // ── 0. Clean previous sample data ──
    await cleanData(dataSource);

    // ── 1. Create commercial users + profiles ──
    console.log('\n📋 Step 1: Creating commercial users...');
    const commercialIds: Array<{ userId: number; profileId: string; email: string; name: string }> = [];

    for (const c of COMMERCIALS) {
      const passwordHash = await bcrypt.hash(c.password, 10);
      const userResult = await dataSource.query(
        `INSERT INTO users (email, password_hash, fullname, role, status, is_email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'commercial', 'active', true, NOW(), NOW()) RETURNING id`,
        [c.email, passwordHash, c.name],
      );
      const userId = userResult[0].id;

      const profileResult = await dataSource.query(
        `INSERT INTO commercial_profiles (user_id, status, preferred_currency, points_balance, total_referrals, last_reward_milestone, created_at, updated_at)
         VALUES ($1, 'active', 'EUR', 0, 0, 0, NOW(), NOW()) RETURNING id`,
        [userId],
      );
      const profileId = profileResult[0].id;

      commercialIds.push({ userId, profileId, email: c.email, name: c.name });
      console.log(`  ✅ Created: ${c.name} (${c.email})`);
    }

    // ── 2. Create promo codes ──
    console.log('\n📋 Step 2: Creating promo codes...');
    const promoCodeMap: Record<string, string> = {};

    for (let i = 0; i < PROMO_CODES.length; i++) {
      const pc = PROMO_CODES[i];
      const commercial = commercialIds[Math.floor(i / 2)];

      const result = await dataSource.query(
        `INSERT INTO promo_codes
         (code, discount_type, discount_value, active, max_uses, per_user_limit, commercial_id, created_at, updated_at)
         VALUES ($1, $2, $3, true, 100, 1, $4, NOW(), NOW()) RETURNING id`,
        [pc.code, pc.discountType, pc.discountValue, commercial.profileId],
      );
      promoCodeMap[pc.code] = result[0].id;
      console.log(`  ✅ ${pc.code} (${pc.discountValue}% off) → ${commercial.name}`);
    }

    // ── 3. Find standard plan ──
    const planRow = await dataSource.query(
      `SELECT id, slug, name FROM subscription_plans WHERE slug = 'standard' LIMIT 1`,
    );
    if (!planRow || planRow.length === 0) {
      console.log('  ⚠️  Standard plan not found — run seed.ts first');
      await app.close();
      return;
    }
    const planId = planRow[0].id;

    // ── 4. Create learners + simulate purchases ──
    console.log('\n📋 Step 3: Creating learners + simulating purchases...');

    let totalRedemptions = 0;
    const commercialReferralCounts: Record<string, number> = {};
    commercialIds.forEach(c => { commercialReferralCounts[c.profileId] = 0; });

    for (let i = 0; i < LEARNER_NAMES.length; i++) {
      const learnerName = LEARNER_NAMES[i];
      const learnerEmail = `learner.${i + 1}@subul.test`;
      const promoCode = pick(Object.keys(promoCodeMap));
      const promoCodeId = promoCodeMap[promoCode];
      const country = pick(COUNTRIES);
      const billingCycle = pick(BILLING_CYCLES);

      const pcRow = await dataSource.query(
        `SELECT commercial_id FROM promo_codes WHERE id = $1`,
        [promoCodeId],
      );
      const commercialProfileId = pcRow[0]?.commercial_id;

      const baseCents = Math.round(country.basePrice * country.divisor);
      const cycleMultiplier = billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : 12;
      const discountPct = PROMO_CODES.find(p => p.code === promoCode)?.discountValue || 0;
      const discountCents = Math.round(baseCents * cycleMultiplier * (discountPct / 100));
      const finalCents = baseCents * cycleMultiplier - discountCents;

      const passwordHash = await bcrypt.hash('Learner123!', 10);
      const userResult = await dataSource.query(
        `INSERT INTO users (email, password_hash, fullname, role, status, is_email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'learner', 'active', true, NOW(), NOW()) RETURNING id`,
        [learnerEmail, passwordHash, learnerName],
      );
      const userId = userResult[0].id;

      // Payment transaction
      const txResult = await dataSource.query(
        `INSERT INTO payment_transactions
         (user_id, provider, provider_payment_intent_id, plan_slug, plan_name, billing_cycle, amount_cents, original_amount_cents,
          discount_cents, currency, country_code, status, promo_code_id, created_at, updated_at)
         VALUES ($1, 'stripe', 'pi_sample_${Date.now()}_${i}', $2, 'Standard Plan', $3, $4, $5, $6, $7, $8, 'paid', $9, NOW(), NOW())
         RETURNING id`,
        [userId, 'standard', billingCycle, finalCents, baseCents * cycleMultiplier, discountCents,
         country.currency, country.code, promoCodeId],
      );
      const txId = txResult[0].id;

      // Subscription
      const now = new Date();
      const end = new Date(now);
      const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, annual: 12 };
      end.setMonth(end.getMonth() + (cycleMonths[billingCycle] || 1));

      await dataSource.query(
        `INSERT INTO user_subscriptions
         (user_id, plan_id, subscription_status, current_period_start, current_period_end, is_trial_used, payment_transaction_id, created_at, updated_at)
         VALUES ($1, $2, 'active', $3, $4, false, $5, NOW(), NOW())`,
        [userId, planId, now.toISOString(), end.toISOString(), txId],
      );

      // Redemption
      await dataSource.query(
        `INSERT INTO promo_code_redemptions
         (promo_code_id, user_id, payment_transaction_id, discount_applied_cents, original_amount_cents,
          final_amount_cents, currency, payment_status, commercial_id, commission_amount_cents,
          commission_paid, earning_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', $8, NULL, false, 'validated', NOW())`,
        [promoCodeId, userId, txId, discountCents, baseCents * cycleMultiplier, finalCents,
         country.currency, commercialProfileId],
      );

      if (commercialProfileId) {
        commercialReferralCounts[commercialProfileId] =
          (commercialReferralCounts[commercialProfileId] || 0) + 1;
      }

      totalRedemptions++;
      console.log(`  ✅ ${learnerName.padEnd(20)} → ${promoCode.padEnd(12)} (${country.currency} ${(finalCents / country.divisor).toFixed(2)})`);
    }

    // ── 5. Award points for each referral ──
    console.log('\n📋 Step 4: Awarding points for referrals...');

    const POINTS_PER_REFERRAL = 10; // sample: 10 pts per referral for testing

    for (const commercial of commercialIds) {
      const count = commercialReferralCounts[commercial.profileId] || 0;
      const pointsEarned = count * POINTS_PER_REFERRAL;

      // Update commercial profile
      await dataSource.query(
        `UPDATE commercial_profiles
         SET total_referrals = $1, points_balance = $2, updated_at = NOW()
         WHERE id = $3`,
        [count, pointsEarned, commercial.profileId],
      );

      // Insert individual ledger entries
      for (let r = 1; r <= count; r++) {
        const balanceAfter = r * POINTS_PER_REFERRAL;
        await dataSource.query(
          `INSERT INTO commercial_points_ledger
           (commercial_id, points_change, balance_after, type, source, source_id, description,
            eur_cents_equivalent, created_at)
           VALUES ($1, $2, $3, 'earn', 'referral', NULL, 'Referral signup rewarded with points', NULL, NOW())`,
          [commercial.profileId, POINTS_PER_REFERRAL, balanceAfter],
        );
      }

      console.log(`  🎉 ${commercial.name.padEnd(25)} → ${count} referrals, +${pointsEarned} points`);
    }

    // ── Summary ──
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`  ✅ Commercials:   ${commercialIds.length}`);
    console.log(`  ✅ Promo codes:   ${Object.keys(promoCodeMap).length}`);
    console.log(`  ✅ Learners:      ${totalRedemptions}`);
    console.log(`  ✅ Redemptions:   ${totalRedemptions}`);

    console.log('\n  📈 Referral Distribution:');
    for (const c of commercialIds) {
      const count = commercialReferralCounts[c.profileId] || 0;
      console.log(`    • ${c.name.padEnd(25)} → ${count} referrals`);
    }

    console.log('\n  🔑 Login Credentials:');
    console.log('    Commercials:');
    for (const c of COMMERCIALS) {
      console.log(`      ${c.email}  /  ${c.password}`);
    }
    console.log('    Learners:');
    console.log(`      learner.1@subul.test  ...  learner.${LEARNER_NAMES.length}@subul.test  /  Learner123!`);

    console.log('\n  🚀 What to test:');
    console.log('    1. Login as commercial → view points, referrals, codes');
    console.log('    2. Login as admin → Users → verify email button');
    console.log('    3. Login as admin → Commercials → detail tabs');
    console.log('    4. Admin → Commercials → Convert Points to Payout (manual)');
    console.log('\n  💡 Note: Points are NOT auto-converted. Admin converts manually.');

    console.log('\n✅ Seeding complete!\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    await app.close();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
