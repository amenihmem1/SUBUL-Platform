import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';
import { UserCourseProgress } from './user-course-progress.entity';
import { Certification } from '../../certifications/entities/certification.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'course_id', length: 50, unique: true })
  courseId!: string;

  @Column({ name: 'external_id', length: 100, nullable: true, unique: true })
  externalId?: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 100, nullable: true })
  level?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true, default: [] })
  objectives?: string[];

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'json', nullable: true, default: [] })
  quiz?: Record<string, unknown>[];

  @Column({ type: 'json', nullable: true, default: [] })
  examTips?: string[];

  @Column({ type: 'json', nullable: true, default: {} })
  resources?: Record<string, unknown>;

  @Column({ length: 50, nullable: true })
  source?: string;

  @Column({ name: 'source_version', length: 50, nullable: true })
  sourceVersion?: string;

  @Column({ name: 'imported_at', type: 'timestamp without time zone', nullable: true })
  importedAt?: Date;

  @Column({ name: 'azure_search_indexed_at', type: 'timestamp without time zone', nullable: true })
  azureSearchIndexedAt?: Date;

  @Column({ name: 'azure_search_document_count', type: 'integer', nullable: true })
  azureSearchDocumentCount?: number | null;

  @Column({ name: 'azure_search_last_error', type: 'text', nullable: true })
  azureSearchLastError?: string | null;

  /**
   * FK → certifications.id
   * A course belongs to a certification (1 cert → many courses).
   */
  @Column({ name: 'certification_id', type: 'integer', nullable: true })
  certificationId?: number;

  /** Learning track this course belongs to: cloud | cyber | ai */
  @Column({ name: 'track', type: 'varchar', length: 20, nullable: true })
  track?: 'cloud' | 'cyber' | 'ai';

  @ManyToOne(() => Certification, (cert) => cert.courses, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'certification_id' })
  certification?: Certification;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @OneToMany(() => CourseModule, (module) => module.course)
  modules!: CourseModule[];

  @OneToMany(() => UserCourseProgress, (progress) => progress.course)
  userProgress!: UserCourseProgress[];
}
