import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCvsTable1712500000000 implements MigrationInterface {
  name = 'CreateUserCvsTable1712500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_cvs" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "file_path" character varying(512),
        "file_name" character varying(255),
        "file_size" integer,
        "file_mime" character varying(128),
        "extracted_data" jsonb,
        "ats_score" double precision,
        "last_analyzed_at" TIMESTAMP WITHOUT TIME ZONE,
        "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_user_cvs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_cvs_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_cvs_user_id" ON "user_cvs" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_user_cvs_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_cvs"`);
  }
}
