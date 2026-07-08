import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerifiedAtAndPasswordResetAudit1712200000000 implements MigrationInterface {
  name = 'AddEmailVerifiedAtAndPasswordResetAudit1712200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP WITHOUT TIME ZONE
    `);
    await queryRunner.query(`
      UPDATE "users" SET "email_verified_at" = "updated_at" WHERE "is_email_verified" = true AND "email_verified_at" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users" SET "password_reset_token" = NULL, "password_reset_token_expires" = NULL
      WHERE "password_reset_token" IS NOT NULL
    `);

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_request_log"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at"`);
  }
}
