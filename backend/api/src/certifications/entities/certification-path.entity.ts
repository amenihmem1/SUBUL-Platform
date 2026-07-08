import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CertificationPathStepType =
  | 'course'
  | 'lab'
  | 'assessment'
  | 'quiz'
  | 'practice_exam'
  | 'final_certificate';

@Entity('certification_paths')
export class CertificationPath {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'certification_id', type: 'int' })
  certificationId!: number;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder!: number;

  @Column({ name: 'step_type', type: 'varchar', length: 20 })
  stepType!: CertificationPathStepType;

  @Column({ name: 'step_ref', type: 'varchar', length: 120 })
  stepRef!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;
}
