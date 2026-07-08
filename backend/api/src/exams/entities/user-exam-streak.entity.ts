import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_exam_streaks')
export class UserExamStreak {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', unique: true })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ default: 0 })
  currentStreak!: number;

  @Column({ default: 0 })
  longestStreak!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExamDate!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
