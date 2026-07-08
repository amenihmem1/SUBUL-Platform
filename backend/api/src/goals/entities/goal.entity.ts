import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GoalCategory, GoalPriority, GoalStatus, GoalVisibility } from './goal-enums';

export { GoalCategory, GoalPriority, GoalStatus, GoalVisibility } from './goal-enums';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: GoalCategory,
    default: GoalCategory.CERTIFICATION
  })
  category!: GoalCategory;

  @Column({
    type: 'enum',
    enum: GoalPriority,
    default: GoalPriority.MEDIUM
  })
  priority!: GoalPriority;

  @Column({ name: 'success_criteria', type: 'text', nullable: true })
  successCriteria!: string;

  @Column({ type: 'date', nullable: true })
  deadline!: Date;

  @Column({ nullable: true })
  motivation!: string;

  @Column({
    type: 'enum',
    enum: GoalVisibility,
    default: GoalVisibility.PRIVATE
  })
  visibility!: GoalVisibility;

  @Column({ nullable: true })
  reward!: string;

  @Column({ default: 0 })
  progress!: number;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ON_TRACK
  })
  status!: GoalStatus;

  @Column({ type: 'text', nullable: true })
  milestones!: string; // JSON string

  @Column({ name: 'completed_milestones', type: 'text', nullable: true })
  completedMilestones!: string; // JSON string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods for milestones
  getMilestones(): string[] {
    if (!this.milestones) return [];
    try {
      return JSON.parse(this.milestones);
    } catch {
      return [];
    }
  }

  setMilestones(milestones: string[]): void {
    this.milestones = JSON.stringify(milestones);
  }

  getCompletedMilestones(): string[] {
    if (!this.completedMilestones) return [];
    try {
      return JSON.parse(this.completedMilestones);
    } catch {
      return [];
    }
  }

  setCompletedMilestones(milestones: string[]): void {
    this.completedMilestones = JSON.stringify(milestones);
  }

  addCompletedMilestone(milestone: string): void {
    const completed = this.getCompletedMilestones();
    if (!completed.includes(milestone)) {
      completed.push(milestone);
      this.setCompletedMilestones(completed);
      
      // Update progress based on completed milestones
      const totalMilestones = this.getMilestones().length;
      if (totalMilestones > 0) {
        this.progress = Math.round((completed.length / totalMilestones) * 100);
        if (this.progress >= 100) {
          this.status = GoalStatus.COMPLETED;
        } else if (this.progress >= 80) {
          this.status = GoalStatus.ON_TRACK;
        } else {
          this.status = GoalStatus.BEHIND;
        }
      }
    }
  }
}
