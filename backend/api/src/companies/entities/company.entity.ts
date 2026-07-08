import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 128, nullable: true })
  sector?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 255, nullable: true })
  logo?: string;

  @Column({ length: 255, nullable: true })
  website?: string;

  @Column({ length: 64, nullable: true })
  phone?: string;

  @Column({ length: 128, nullable: true })
  companySize?: string;

  @Column({ length: 128, nullable: true })
  industry?: string;

  @Column({ length: 255, nullable: true })
  location?: string;

  @Column({ length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'json', default: [] })
  employees!: any[];

  @Column({ type: 'json', default: [] })
  publications!: any[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column({ name: 'owner_id', nullable: true })
  ownerId?: number;

  @OneToMany(() => Job, job => job.company)
  jobs!: Job[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
