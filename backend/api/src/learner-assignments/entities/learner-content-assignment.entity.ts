import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type ContentType = 'course' | 'lab' | 'certification';

@Entity('learner_content_assignments')
export class LearnerContentAssignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'content_type', length: 20 })
  contentType!: ContentType;

  /** courseId VARCHAR, lab slug, or cert id as string */
  @Column({ name: 'content_ref', length: 255 })
  contentRef!: string;

  @Column({ name: 'granted_by', nullable: true, type: 'int' })
  grantedBy!: number | null;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;

  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt!: Date | null;

  @Column({ nullable: true, type: 'text' })
  note!: string | null;
}
