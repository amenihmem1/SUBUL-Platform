import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 100 })
  provider!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column({ default: 0 })
  students!: number;

  @Column({ default: 0 })
  completion!: number;

  @Column({ enum: ['Active', 'Draft', 'Archived'], default: 'Draft' })
  status!: 'Active' | 'Draft' | 'Archived';

  @Column({ default: true })
  available!: boolean;

  @Column({ nullable: true })
  duration!: string;

  @Column({ nullable: true })
  price!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt!: Date;
}