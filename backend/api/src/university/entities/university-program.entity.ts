import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { University } from './university.entity';
import { UniversityProgramEnrollment } from './university-program-enrollment.entity';
import { UniversityInvite } from './university-invite.entity';

@Entity('university_programs')
export class UniversityProgram {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, u => u.programs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'certification_id', nullable: true })
  certificationId?: number;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UniversityProgramEnrollment, e => e.program)
  enrollments!: UniversityProgramEnrollment[];

  @OneToMany(() => UniversityInvite, i => i.program)
  invites!: UniversityInvite[];
}
