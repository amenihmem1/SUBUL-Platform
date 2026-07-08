import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: User;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId?: number;

  @Column({ name: 'recipient_role', length: 50, nullable: true })
  recipientRole?: string;

  @Column({ length: 100 })
  type!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId?: string;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
