import { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildReferralSystem1713500000000 implements MigrationInterface {
  name = 'RebuildReferralSystem1713500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old tables (order matters for FK constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS referral_rewards CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS referrals CASCADE`);

    // ── referrals ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE referrals (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_user_id          INT NOT NULL,
        referred_user_id          INT NOT NULL,
        referral_code_used        VARCHAR(16) NOT NULL,
        status                    VARCHAR(32) NOT NULL DEFAULT 'created',
        fraud_score               SMALLINT NOT NULL DEFAULT 0,
        fraud_flags               JSONB,
        signup_ip                 VARCHAR(64),
        signup_at                 TIMESTAMPTZ,
        email_verified_at         TIMESTAMPTZ,
        activated_at              TIMESTAMPTZ,
        waiting_period_ends_at    TIMESTAMPTZ,
        qualified_at              TIMESTAMPTZ,
        disqualified_at           TIMESTAMPTZ,
        disqualification_reason   VARCHAR(64),
        rewarded_at               TIMESTAMPTZ,
        admin_notes               TEXT,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_referrals_referred_user UNIQUE (referred_user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id)`);
    await queryRunner.query(`CREATE INDEX idx_referrals_status ON referrals(status)`);
    await queryRunner.query(`CREATE INDEX idx_referrals_code ON referrals(referral_code_used)`);
    await queryRunner.query(`CREATE INDEX idx_referrals_waiting ON referrals(waiting_period_ends_at) WHERE status = 'active_waiting'`);

    // ── referral_rewards ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE referral_rewards (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           INT NOT NULL,
        reward_block      INT NOT NULL,
        milestone_target  INT NOT NULL DEFAULT 20,
        amount_cents      INT NOT NULL DEFAULT 100000,
        currency          VARCHAR(3) NOT NULL DEFAULT 'TND',
        status            VARCHAR(32) NOT NULL DEFAULT 'claimable',
        unlocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimable_at      TIMESTAMPTZ,
        reserved_at       TIMESTAMPTZ,
        paid_at           TIMESTAMPTZ,
        reversed_at       TIMESTAMPTZ,
        payout_request_id UUID,
        rule_snapshot     JSONB NOT NULL DEFAULT '{}',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_reward_block UNIQUE (user_id, reward_block)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rewards_user ON referral_rewards(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_rewards_status ON referral_rewards(status)`);
    await queryRunner.query(`CREATE INDEX idx_rewards_request ON referral_rewards(payout_request_id)`);

    // ── payout_accounts ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_accounts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         INT NOT NULL,
        method          VARCHAR(8) NOT NULL,
        label           VARCHAR(64),
        account_details JSONB NOT NULL DEFAULT '{}',
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON payout_accounts(user_id)`);

    // ── payout_requests ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             INT NOT NULL,
        payout_account_id   UUID,
        payout_method       VARCHAR(8) NOT NULL,
        payout_details      JSONB NOT NULL DEFAULT '{}',
        total_amount_cents  INT NOT NULL,
        reward_count        INT NOT NULL,
        status              VARCHAR(32) NOT NULL DEFAULT 'submitted',
        admin_notes         TEXT,
        submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at         TIMESTAMPTZ,
        approved_at         TIMESTAMPTZ,
        paid_at             TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON payout_requests(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status)`);

    // ── payout_request_items ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_request_items (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_request_id   UUID NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
        referral_reward_id  UUID NOT NULL REFERENCES referral_rewards(id),
        amount_cents        INT NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_payout_item UNIQUE (referral_reward_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payout_items_request ON payout_request_items(payout_request_id)`);

    // ── referral_audit_log ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referral_audit_log (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type     VARCHAR(32) NOT NULL,
        entity_id       UUID NOT NULL,
        action          VARCHAR(64) NOT NULL,
        old_status      VARCHAR(32),
        new_status      VARCHAR(32),
        changed_by      INT,
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON referral_audit_log(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON referral_audit_log(created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS referral_audit_log CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payout_request_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payout_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payout_accounts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS referral_rewards CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS referrals CASCADE`);
  }
}
