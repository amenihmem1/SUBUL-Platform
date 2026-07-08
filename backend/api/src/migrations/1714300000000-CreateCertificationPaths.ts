import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCertificationPaths1714300000000 implements MigrationInterface {
  name = 'CreateCertificationPaths1714300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certification_paths" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "certification_id" integer NOT NULL REFERENCES "certifications"("id") ON DELETE CASCADE,
        "step_order" integer NOT NULL,
        "step_type" varchar(20) NOT NULL,
        "step_ref" varchar(120) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "created_by" integer NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_certification_paths_unique_step"
      ON "certification_paths" ("certification_id", "step_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_certification_paths_unique_step"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certification_paths"`);
  }
}
