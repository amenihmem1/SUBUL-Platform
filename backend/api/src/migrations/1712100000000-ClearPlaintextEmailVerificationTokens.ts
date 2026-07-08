import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Verification tokens are now stored as SHA-256 hex. Invalidate any legacy plaintext values.
 */
export class ClearPlaintextEmailVerificationTokens1712100000000 implements MigrationInterface {
  name = 'ClearPlaintextEmailVerificationTokens1712100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "email_verification_token" = NULL, "email_verification_token_expires" = NULL WHERE "email_verification_token" IS NOT NULL`,
    );
  }

  public async down(): Promise<void> {
    // Irreversible data wipe
  }
}
