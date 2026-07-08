import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLabCloudAccess1715000000000 implements MigrationInterface {
  name = 'CreateLabCloudAccess1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE lab_cloud_credentials (
        id              SERIAL PRIMARY KEY,
        provider        VARCHAR(20)  NOT NULL,
        label           VARCHAR(255) NOT NULL,
        credential_type VARCHAR(30)  NOT NULL DEFAULT 'sandbox_account',
        console_url     TEXT,
        login_email     TEXT,
        login_password  TEXT,
        access_key      TEXT,
        secret_key      TEXT,
        extra_fields    JSONB,
        notes           TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE lab_access_sessions (
        id            SERIAL PRIMARY KEY,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider      VARCHAR(20) NOT NULL,
        credential_id INT REFERENCES lab_cloud_credentials(id) ON DELETE SET NULL,
        granted_by    INT REFERENCES users(id) ON DELETE SET NULL,
        granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMPTZ NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        revoked_at    TIMESTAMPTZ,
        notes         TEXT,
        UNIQUE(user_id, provider)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_las_user_provider ON lab_access_sessions(user_id, provider, is_active)`);
    await queryRunner.query(`CREATE INDEX idx_lcc_provider ON lab_cloud_credentials(provider, is_active)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_las_user_provider`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lcc_provider`);
    await queryRunner.query(`DROP TABLE IF EXISTS lab_access_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS lab_cloud_credentials`);
  }
}
