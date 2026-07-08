import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('daily_goals')
export class DailyGoal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, user => user.dailyGoals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  title!: string;

  @Column({ default: false })
  completed!: boolean;

  @Column({ default: 5 })
  points!: number;

  @Column({ name: 'goal_date', type: 'date' })
  goalDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  // Helper methods
  markCompleted(): void {
    if (!this.completed) {
      this.completed = true;
      this.completedAt = new Date();
    }
  }

  markIncomplete(): void {
    this.completed = false;
    this.completedAt = null;
  }
}
