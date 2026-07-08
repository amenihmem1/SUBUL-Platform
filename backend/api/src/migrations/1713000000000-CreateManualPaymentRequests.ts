import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateManualPaymentRequests1713000000000 implements MigrationInterface {
  name = 'CreateManualPaymentRequests1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "manual_payment_requests" (
        "id"                         UUID                NOT NULL DEFAULT gen_random_uuid(),
        "user_id"                    INTEGER             NOT NULL,
        "order_id"                   VARCHAR             NOT NULL,
        "plan_slug"                  VARCHAR             NOT NULL DEFAULT 'standard',
        "plan_name"                  VARCHAR             NOT NULL DEFAULT 'Plan Standard',
        "billing_cycle"              VARCHAR             NOT NULL DEFAULT 'monthly',
        "amount_cents"               INTEGER             NOT NULL,
        "currency"                   VARCHAR(3)          NOT NULL DEFAULT 'TND',
        "payment_method"             VARCHAR             NOT NULL,
        "status"                     VARCHAR             NOT NULL DEFAULT 'pending',
        "proof_file_url"             VARCHAR             NULL,
        "proof_file_path"            VARCHAR             NULL,
        "proof_file_name"            VARCHAR             NULL,
        "admin_notes"                TEXT                NULL,
        "approved_by"                INTEGER             NULL,
        "approved_at"                TIMESTAMPTZ         NULL,
        "selected_duration_months"   INTEGER             NULL,
        "activated_subscription_id"  UUID                NULL,
        "user_email"                 VARCHAR             NULL,
        "user_full_name"             VARCHAR             NULL,
        "created_at"                 TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        "updated_at"                 TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_manual_payment_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_manual_payment_requests_order_id" UNIQUE ("order_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mpr_user_id" ON "manual_payment_requests" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mpr_status"  ON "manual_payment_requests" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "manual_payment_requests"`);
  }
}
