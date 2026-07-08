import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GoalCategory } from './goal-enums';

@Entity('weekly_goals')
export class WeeklyGoal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, user => user.weeklyGoals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: GoalCategory,
    default: GoalCategory.COURSE
  })
  category!: GoalCategory;

  @Column({ default: 0 })
  progress!: number;

  @Column({ default: 100 })
  target!: number;

  @Column({ name: 'week_number' })
  weekNumber!: number;

  @Column()
  year!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods
  updateProgress(delta: number): void {
    this.progress = Math.max(0, Math.min(100, this.progress + delta));
  }

  isCompleted(): boolean {
    return this.progress >= this.target;
  }
}
