import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from './course.entity';

@Entity('user_course_progress')
@Unique('uq_user_course_progress', ['userId', 'courseId'])
export class UserCourseProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'course_id' })
  courseId!: number;

  @Column({ name: 'current_module', default: 1 })
  currentModule!: number;

  @Column({ name: 'current_lesson', default: 1 })
  currentLesson!: number;

  /** Array of module_order numbers that are fully completed */
  @Column({ name: 'completed_modules', type: 'json', default: [] })
  completedModules!: number[];

  /** Array of keys like "module_1_lesson_2" */
  @Column({ name: 'completed_lessons', type: 'json', default: [] })
  completedLessons!: string[];

  /** Array of lab_id strings */
  @Column({ name: 'completed_labs', type: 'json', default: [] })
  completedLabs!: string[];

  @Column({ name: 'overall_progress', default: 0 })
  overallProgress!: number;

  /** { "1": 50, "2": 100, ... } keyed by module_order */
  @Column({ name: 'module_progress', type: 'json', default: {} })
  moduleProgress!: Record<string, number>;

  @Column({ length: 20, default: 'not_started' })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamp without time zone', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp without time zone', nullable: true })
  completedAt?: Date;

  @Column({ name: 'last_accessed_at', type: 'timestamp without time zone', nullable: true })
  lastAccessedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Course, (course) => course.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course;

  toDict(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      courseId: this.courseId,
      currentModule: this.currentModule,
      currentLesson: this.currentLesson,
      completedModules: this.completedModules ?? [],
      completedLessons: this.completedLessons ?? [],
      completedLabs: this.completedLabs ?? [],
      overallProgress: this.overallProgress,
      moduleProgress: this.moduleProgress ?? {},
      status: this.status,
      startedAt: this.startedAt?.toISOString() ?? null,
      completedAt: this.completedAt?.toISOString() ?? null,
      lastAccessedAt: this.lastAccessedAt?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
