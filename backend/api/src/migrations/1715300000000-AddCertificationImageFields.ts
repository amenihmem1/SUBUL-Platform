import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificationImageFields1715300000000 implements MigrationInterface {
  name = 'AddCertificationImageFields1715300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS skills TEXT[]`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS passing_score INTEGER`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS num_questions INTEGER`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS exam_duration_minutes INTEGER`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr'`);
    await queryRunner.query(`ALTER TABLE certifications ADD COLUMN IF NOT EXISTS tags TEXT[]`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['image_url','banner_url','icon_url','skills','passing_score','num_questions','exam_duration_minutes','language','tags']) {
      await queryRunner.query(`ALTER TABLE certifications DROP COLUMN IF EXISTS ${col}`);
    }
  }
}
