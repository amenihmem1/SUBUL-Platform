import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuoteRequestsTable1712000000000 implements MigrationInterface {
  name = 'CreateQuoteRequestsTable1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quote_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "email" character varying(180) NOT NULL,
        "phone" character varying(32),
        "organization" character varying(180) NOT NULL,
        "number_of_users" integer NOT NULL,
        "message" text,
        "plan_type" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quote_requests_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quote_requests_created_at" ON "quote_requests" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_quote_requests_status" ON "quote_requests" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quote_requests_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quote_requests_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quote_requests"`);
  }
}
