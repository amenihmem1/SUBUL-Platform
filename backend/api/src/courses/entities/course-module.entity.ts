import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { Lab } from './lab.entity';

@Entity('modules')
@Unique('uq_module_order_per_course', ['courseId', 'moduleOrder'])
export class CourseModule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'course_id' })
  courseId!: number;

  @Column({ name: 'module_order', type: 'smallint' })
  moduleOrder!: number;

  @Column({ name: 'external_id', length: 100, nullable: true })
  externalId?: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 20, nullable: true })
  icon?: string;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'json', nullable: true, default: [] })
  objectives?: string[];

  @Column({ type: 'json', nullable: true, default: [] })
  quiz?: Record<string, unknown>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course;

  @OneToMany(() => Lesson, (lesson) => lesson.module, { cascade: true })
  lessons!: Lesson[];

  @OneToMany(() => Lab, (lab) => lab.module, { cascade: true })
  labs!: Lab[];

  toDict(includeContent = false): Record<string, any> {
    const data: Record<string, any> = {
      moduleId: this.moduleOrder,
      title: this.title,
      icon: this.icon ?? null,
    };
    if (includeContent) {
      data['lessons'] = (this.lessons ?? [])
        .sort((a, b) => a.lessonOrder - b.lessonOrder)
        .map((l) => l.toDict());
      data['labs'] = (this.labs ?? [])
        .sort((a, b) => a.labOrder - b.labOrder)
        .map((l) => l.toDict());
    }
    return data;
  }
}
