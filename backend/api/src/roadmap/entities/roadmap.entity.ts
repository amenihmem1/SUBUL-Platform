import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_roadmaps')
export class UserRoadmap {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  modules!: RoadmapModule[];

  @Column({ type: 'jsonb', nullable: true })
  userProfile?: UserProfile;

  @Column({ type: 'integer', default: 0 })
  totalProgress!: number;

  @Column({ type: 'integer', default: 0 })
  userLevel!: number;

  @Column({ type: 'integer', default: 0 })
  totalXP!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt!: Date;
}

export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked' | 'upcoming';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  progress?: number;
  icon: string;
  color: string;
  prerequisites?: string[];
  estimatedHours: number;
  skills: string[];
  profile?: string;
  isBooster?: boolean; 
}

export interface UserProfile {
  primaryProfile: string;
  hybridProfiles: string[];
  scores: {
    cloudPercentage: number;
    cyberPercentage: number;
    aiPercentage: number;
    devopsPercentage?: number;
  };
}