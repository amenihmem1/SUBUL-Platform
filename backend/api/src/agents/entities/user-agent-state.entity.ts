import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_agent_state')
@Unique(['userId', 'agentSlug'])
export class UserAgentState {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'agent_slug', length: 64 })
  agentSlug!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'updated_at', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
