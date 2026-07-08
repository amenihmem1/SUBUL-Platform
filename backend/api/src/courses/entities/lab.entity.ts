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
import { CourseModule } from './course-module.entity';

@Entity('course_labs')
@Unique('uq_lab_order_per_module', ['moduleId', 'labOrder'])
@Unique('uq_lab_id_per_module', ['moduleId', 'labId'])
export class Lab {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'module_id', nullable: true })
  moduleId!: number;

  @Column({ name: 'lab_id', length: 50, nullable: true })
  labId!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  objective?: string;

  @Column({ name: 'lab_order', type: 'smallint', nullable: true })
  labOrder!: number;

  // ── Extended fields matching the Python Lab model ─────────────────────────────

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ name: 'evaluation_criteria', type: 'json', nullable: true, default: [] })
  evaluationCriteria?: string[];

  @Column({ name: 'learning_objectives', type: 'json', nullable: true, default: [] })
  learningObjectives?: string[];

  @Column({ name: 'difficulty_level', length: 20, nullable: true })
  difficultyLevel?: string;

  @Column({ name: 'prerequisites', type: 'json', nullable: true, default: [] })
  prerequisites?: string[];

  @Column({ name: 'resources', type: 'json', nullable: true, default: [] })
  resources?: Record<string, any>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @ManyToOne(() => CourseModule, (module) => module.labs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: CourseModule;

  toDict(): Record<string, any> {
    return {
      labId: this.labId,
      title: this.title,
      objective: this.objective ?? null,
      order: this.labOrder,
      durationMinutes: this.durationMinutes ?? null,
      evaluationCriteria: this.evaluationCriteria ?? [],
      learningObjectives: this.learningObjectives ?? [],
      difficultyLevel: this.difficultyLevel ?? null,
      prerequisites: this.prerequisites ?? [],
      resources: this.resources ?? [],
    };
  }
}
