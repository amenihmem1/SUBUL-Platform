import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('agent_usage_monthly')
@Unique(['userId', 'agentKey', 'yearMonth'])
@Index(['yearMonth'])
export class AgentUsageMonthly {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'agent_key', length: 64 })
  agentKey!: string;

  /** Format YYYY-MM */
  @Column({ name: 'year_month', length: 7 })
  yearMonth!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;
}
