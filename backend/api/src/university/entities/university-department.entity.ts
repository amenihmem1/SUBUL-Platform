import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { University } from './university.entity';

@Entity('university_departments')
export class UniversityDepartment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
