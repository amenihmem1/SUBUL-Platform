import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('course_completion_certificates')
@Unique('uq_ccc_user_course', ['userId', 'courseId'])
export class CourseCompletionCertificate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'course_id' })
  courseId!: number;

  @Column({ name: 'cert_hash', length: 32, unique: true })
  certHash!: string;

  @Column({ name: 'course_title', length: 500 })
  courseTitle!: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course!: Course;
}
