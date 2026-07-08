"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const COMMERCIALS = [
    { email: 'ahmed.commercial@subul.test', name: 'Ahmed Ben Salem', password: 'Commercial123!' },
    { email: 'sara.commercial@subul.test', name: 'Sara Mansouri', password: 'Commercial123!' },
    { email: 'yassine.commercial@subul.test', name: 'Yassine Trabelsi', password: 'Commercial123!' },
];
const PROMO_CODES = [
    { code: 'AHMED15', discountType: 'percentage', discountValue: 15 },
    { code: 'AHMED20', discountType: 'percentage', discountValue: 20 },
    { code: 'SARA10', discountType: 'percentage', discountValue: 10 },
    { code: 'SARA25', discountType: 'percentage', discountValue: 25 },
    { code: 'YASSINE30', discountType: 'percentage', discountValue: 30 },
    { code: 'YASSINE50', discountType: 'percentage', discountValue: 50 },
];
const LEARNER_NAMES = [
    'Mohamed Ali', 'Fatma Bouazizi', 'Karim Jebali', 'Amira Saidi', 'Omar Hamdi',
    'Nour Chaabane', 'Rim Gharbi', 'Amine Belhaj', 'Ines Messaoudi', 'Taha Riahi',
    'Salma Khalil', 'Bassem Dridi', 'Maya Fakhfakh', 'Hichem Sassi', 'Rania Ayari',
    'Slim Marzouki', 'Eya Nasri', 'Wassim Kallel', 'Aya Zouari', 'Mehdi Rekik',
    'Lina Maalej', 'Anis Bouslama', 'Donia Gharbi', 'Youssef Triki', 'Meriam Haddad',
    'Imed Ben Amor', 'Chaima Lahiani', 'Bilel Maktouf', 'Sonda Karray', 'Hamza Sellami',
    'Rim Boukadida', 'Amine Jallouli', 'Ghada Sfar', 'Oussama Ben Salah', 'Mariem Khemiri',
    'Fares Dhaouadi', 'Nesrine Abid', 'Aymen Gharbi', 'Sonia Bouaziz', 'Tarek Mejri',
    'Haifa Zouari', 'Nabil Hachicha', 'Imen Cherni', 'Rami Chebbi', 'Asma Louati',
];
const PLAN_SLUGS = ['standard'];
const BILLING_CYCLES = ['monthly', 'quarterly', 'annual'];
const COUNTRIES = [
    { code: 'TN', currency: 'TND', divisor: 1000, basePrice: 49.99 },
    { code: 'US', currency: 'USD', divisor: 100, basePrice: 9.99 },
    { code: 'EU', currency: 'EUR', divisor: 100, basePrice: 9.99 },
];
async function seed() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const dataSource = app.get(typeorm_1.DataSource);
    const queryRunner = dataSource.createQueryRunner();
    try {
        console.log('🌱 Seeding commercial / promo code / referral / points flow...\n');
        console.log('📋 Step 1: Creating commercial users...');
        const commercialIds = [];
        for (const c of COMMERCIALS) {
            const existingUser = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [c.email]);
            if (existingUser.length > 0) {
                console.log(`  ⏭️  Commercial ${c.email} already exists, skipping`);
                const profile = await dataSource.query(`SELECT id FROM commercial_profiles WHERE user_id = $1`, [existingUser[0].id]);
                commercialIds.push({
                    userId: existingUser[0].id,
                    profileId: profile[0]?.id,
                    email: c.email,
                    name: c.name,
                });
                continue;
            }
            const passwordHash = await bcrypt.hash(c.password, 10);
            const userResult = await dataSource.query(`INSERT INTO users (email, password_hash, full_name, role, status, is_email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, 'commercial', 'active', true, NOW(), NOW()) RETURNING id`, [c.email, passwordHash, c.name]);
            const userId = userResult[0].id;
            const profileResult = await dataSource.query(`INSERT INTO commercial_profiles (user_id, status, preferred_currency, points_balance, total_referrals, last_reward_milestone, created_at, updated_at)
         VALUES ($1, 'active', 'EUR', 0, 0, 0, NOW(), NOW()) RETURNING id`, [userId]);
            const profileId = profileResult[0].id;
            commercialIds.push({ userId, profileId, email: c.email, name: c.name });
            console.log(`  ✅ Created commercial: ${c.name} (${c.email}) — profile ${profileId}`);
        }
        console.log('\n📋 Step 2: Creating promo codes...');
        const promoCodeMap = {};
        for (let i = 0; i < PROMO_CODES.length; i++) {
            const pc = PROMO_CODES[i];
            const commercial = commercialIds[Math.floor(i / 2)];
            const existing = await dataSource.query(`SELECT id FROM promo_codes WHERE code = $1`, [pc.code]);
            if (existing.length > 0) {
                console.log(`  ⏭️  Promo code ${pc.code} already exists, skipping`);
                promoCodeMap[pc.code] = existing[0].id;
                continue;
            }
            const result = await dataSource.query(`INSERT INTO promo_codes
         (code, discount_type, discount_value, active, max_uses, per_user_limit, commercial_id, created_at, updated_at)
         VALUES ($1, $2, $3, true, 100, 1, $4, NOW(), NOW()) RETURNING id`, [pc.code, pc.discountType, pc.discountValue, commercial.profileId]);
            promoCodeMap[pc.code] = result[0].id;
            console.log(`  ✅ Created promo code: ${pc.code} (${pc.discountValue}% off) → ${commercial.name}`);
        }
        console.log('\n📋 Step 3: Creating learners + simulating purchases...');
        const planRow = await dataSource.query(`SELECT id, slug, name FROM subscription_plans WHERE slug = 'standard' LIMIT 1`);
        if (!planRow || planRow.length === 0) {
            console.log('  ⚠️  Standard plan not found — run seed.ts first to seed plans');
            await app.close();
            return;
        }
        const planId = planRow[0].id;
        let totalRedemptions = 0;
        const commercialReferralCounts = {};
        commercialIds.forEach(c => { commercialReferralCounts[c.profileId] = 0; });
        for (let i = 0; i < LEARNER_NAMES.length; i++) {
            const learnerName = LEARNER_NAMES[i];
            const learnerEmail = `learner.${i + 1}@subul.test`;
            const promoCode = pick(Object.keys(promoCodeMap));
            const promoCodeId = promoCodeMap[promoCode];
            const country = pick(COUNTRIES);
            const billingCycle = pick(BILLING_CYCLES);
            const pcRow = await dataSource.query(`SELECT commercial_id FROM promo_codes WHERE id = $1`, [promoCodeId]);
            const commercialProfileId = pcRow[0]?.commercial_id;
            const baseCents = Math.round(country.basePrice * country.divisor);
            const cycleMultiplier = billingCycle === 'monthly' ? 1 : billingCycle === 'quarterly' ? 3 : 12;
            const discountPct = PROMO_CODES.find(p => p.code === promoCode)?.discountValue || 0;
            const discountCents = Math.round(baseCents * cycleMultiplier * (discountPct / 100));
            const finalCents = Math.round((baseCents * cycleMultiplier - discountCents) * 100) / 100;
            const existingLearner = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [learnerEmail]);
            let userId;
            if (existingLearner.length > 0) {
                userId = existingLearner[0].id;
            }
            else {
                const passwordHash = await bcrypt.hash('Learner123!', 10);
                const userResult = await dataSource.query(`INSERT INTO users (email, password_hash, full_name, role, status, is_email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, 'learner', 'active', true, NOW(), NOW()) RETURNING id`, [learnerEmail, passwordHash, learnerName]);
                userId = userResult[0].id;
            }
            const txResult = await dataSource.query(`INSERT INTO payment_transactions
         (user_id, provider, provider_payment_intent_id, plan_slug, billing_cycle, amount_cents, original_amount_cents,
          discount_cents, currency, country_code, status, promo_code_id, created_at, updated_at)
         VALUES ($1, 'stripe', 'pi_sim_${Date.now()}_${i}', $2, $3, $4, $5, $6, $7, $8, 'paid', $9, NOW(), NOW())
         RETURNING id`, [userId, 'standard', billingCycle, finalCents, baseCents * cycleMultiplier, discountCents,
                country.currency, country.code, promoCodeId]);
            const txId = txResult[0].id;
            const now = new Date();
            const end = new Date(now);
            const cycleMonths = { monthly: 1, quarterly: 3, annual: 12 };
            end.setMonth(end.getMonth() + (cycleMonths[billingCycle] || 1));
            await dataSource.query(`INSERT INTO user_subscriptions
         (user_id, plan_id, status, start_date, end_date, is_trial, payment_transaction_id, created_at, updated_at)
         VALUES ($1, $2, 'active', $3, $4, false, $5, NOW(), NOW())
         ON CONFLICT DO NOTHING`, [userId, planId, now.toISOString(), end.toISOString(), txId]);
            const subRow = await dataSource.query(`SELECT id FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]);
            if (subRow.length > 0) {
                await dataSource.query(`UPDATE payment_transactions SET subscription_id = $1 WHERE id = $2`, [subRow[0].id, txId]);
            }
            await dataSource.query(`INSERT INTO promo_code_redemptions
         (promo_code_id, user_id, payment_transaction_id, discount_applied_cents, original_amount_cents,
          final_amount_cents, currency, payment_status, commercial_id, commission_amount_cents,
          commission_paid, earning_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', $8, NULL, false, 'validated', NOW())
         ON CONFLICT DO NOTHING`, [promoCodeId, userId, txId, discountCents, baseCents * cycleMultiplier, finalCents,
                country.currency, commercialProfileId]);
            if (commercialProfileId) {
                commercialReferralCounts[commercialProfileId] =
                    (commercialReferralCounts[commercialProfileId] || 0) + 1;
            }
            totalRedemptions++;
            console.log(`  ✅ Learner ${learnerName} → ${promoCode} (${country.currency} ${finalCents / country.divisor})`);
        }
        console.log('\n📋 Step 4: Updating commercial referral counts and awarding points...');
        const REFERRALS_PER_REWARD = 20;
        const POINTS_PER_REWARD = 100;
        for (const commercial of commercialIds) {
            const count = commercialReferralCounts[commercial.profileId] || 0;
            const milestones = Math.floor(count / REFERRALS_PER_REWARD);
            const pointsEarned = milestones * POINTS_PER_REWARD;
            await dataSource.query(`UPDATE commercial_profiles
         SET total_referrals = $1, last_reward_milestone = $2, points_balance = $3, updated_at = NOW()
         WHERE id = $4`, [count, milestones * REFERRALS_PER_REWARD, pointsEarned, commercial.profileId]);
            for (let m = 1; m <= milestones; m++) {
                const milestonePts = m * POINTS_PER_REWARD;
                await dataSource.query(`INSERT INTO commercial_points_ledger
           (commercial_id, points_change, balance_after, type, source, source_id, description,
            eur_cents_equivalent, created_at)
           VALUES ($1, $2, $3, 'earn', 'milestone_reward', NULL, $4, $5, NOW())`, [commercial.profileId, POINTS_PER_REWARD, milestonePts,
                    `Referral milestone: ${m * REFERRALS_PER_REWARD} referrals`, milestonePts]);
            }
            console.log(`  🎉 ${commercial.name}: ${count} referrals → ${pointsEarned} points (${milestones} milestones)`);
        }
        console.log('\n' + '='.repeat(60));
        console.log('📊 SEEDING SUMMARY');
        console.log('='.repeat(60));
        console.log(`  ✅ Commercial users created:  ${commercialIds.length}`);
        console.log(`  ✅ Promo codes created:       ${Object.keys(promoCodeMap).length}`);
        console.log(`  ✅ Learner purchases:          ${totalRedemptions}`);
        console.log(`  ✅ Total redemptions:          ${totalRedemptions}`);
        console.log('\n  📈 Commercial Performance:');
        for (const commercial of commercialIds) {
            const count = commercialReferralCounts[commercial.profileId] || 0;
            const pts = Math.floor(count / REFERRALS_PER_REWARD) * POINTS_PER_REWARD;
            console.log(`    • ${commercial.name.padEnd(25)} → ${count} referrals, ${pts} points`);
        }
        console.log('\n  🔑 Test Credentials:');
        console.log('    Commercials:');
        for (const c of COMMERCIALS) {
            console.log(`      Email: ${c.email}`);
            console.log(`      Password: ${c.password}`);
        }
        console.log('    Learners (any):');
        console.log(`      Email: learner.1@subul.test ... learner.${LEARNER_NAMES.length}@subul.test`);
        console.log(`      Password: Learner123!`);
        console.log('\n  🚀 Next steps:');
        console.log('    1. Login as a commercial to see points & referrals');
        console.log('    2. Login as admin → Users → click "Verify Email" button');
        console.log('    3. Login as admin → Commercials → view detail pages');
        console.log('    4. Login as admin → Commercials → Create Payout to convert points');
        console.log('\n✅ Seeding complete!\n');
    }
    catch (err) {
        console.error('❌ Seeding failed:', err);
        throw err;
    }
    finally {
        await queryRunner.release();
        await app.close();
    }
}
seed().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed-commercial.js.map