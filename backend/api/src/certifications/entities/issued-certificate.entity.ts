import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('issued_certificates')
@Unique('uq_issued_certificate_user_cert', ['userId', 'certificationId'])
@Unique('uq_issued_certificate_verification_code', ['verificationCode'])
export class IssuedCertificate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'certification_id', type: 'int' })
  certificationId!: number;

  @Column({ name: 'course_id', type: 'int', nullable: true })
  courseId?: number;

  @Column({ name: 'verification_code', type: 'varchar', length: 64 })
  verificationCode!: string;

  @Column({ name: 'issued_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt!: Date;

  @Column({ type: 'json', nullable: true, default: {} })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
