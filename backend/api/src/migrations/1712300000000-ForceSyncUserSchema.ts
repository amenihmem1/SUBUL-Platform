import { MigrationInterface, QueryRunner } from 'typeorm';

export class ForceSyncUserSchema1712300000000 implements MigrationInterface {
  name = 'ForceSyncUserSchema1712300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Force-add the email_verified_at column if it's missing (Postgres 9.6+ syntax)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP WITHOUT TIME ZONE
    `);

    // Ensure the audit table from the previous skipped migration also exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_request_log" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_request_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_request_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_request_log_created_at"
      ON "password_reset_request_log" ("created_at")
    `);

    // Data-fix: if email verified but timestamp null, default to now
    await queryRunner.query(`
      UPDATE "users" 
      SET "email_verified_at" = now() 
      WHERE "is_email_verified" = true AND "email_verified_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a repair migration; dropping columns would be destructive.
  }
}
