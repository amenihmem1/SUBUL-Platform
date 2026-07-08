import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { LabProgress } from './lab-progress.entity';

export type Provider = 'aws' | 'azure' | 'gcp' | 'nvidia';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Status = 'draft' | 'published' | 'archived';

export interface LabStep {
  title: string;
  instruction: string;
  hint?: string;
  validationNote?: string;
}

@Entity('labs')
export class Lab {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true })
  slug!: string;

  @Column({ nullable: true })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  provider!: Provider;

  @Column({ type: 'varchar', length: 20, nullable: true })
  difficulty!: Difficulty;

  @Column({ name: 'estimated_time', length: 50, nullable: true })
  estimatedTime!: string;

  @Column({ name: 'estimated_duration_minutes', type: 'integer', nullable: true })
  estimatedDurationMinutes!: number | null;

  @Column({ name: 'module_title', length: 255, nullable: true })
  moduleTitle!: string;

  @Column({ type: 'jsonb', nullable: true })
  tasks!: string[];

  @Column({ type: 'jsonb', nullable: true })
  steps!: LabStep[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: {
    level?: string;
    levelLabel?: string;
    index?: number;
    totalInLevel?: number;
    prevSlug?: string;
    nextSlug?: string;
    providerLoginUrl?: string;
    logo?: string;
    tags?: string[];
    learningObjectives?: string[];
    prerequisites?: string[];
    certificationExternalId?: string;
    track?: string;
    scenario?: string;
    environment?: string;
    domainAlignment?: string;
    sequence?: number;
  };

  /** Learning track this lab belongs to: cloud | cyber | ai */
  @Column({ type: 'varchar', length: 20, nullable: true })
  track?: 'cloud' | 'cyber' | 'ai';

  @Column({ type: 'varchar', length: 20, default: 'published' })
  status!: Status;

  @Column({ type: 'jsonb', nullable: true })
  translations?: Record<string, {
    title?: string;
    description?: string;
    tasks?: string[];
    learningObjectives?: string[];
  }>;

  @Column({ name: 'azure_search_indexed_at', type: 'timestamp without time zone', nullable: true })
  azureSearchIndexedAt?: Date;

  @Column({ name: 'azure_search_document_count', type: 'integer', nullable: true })
  azureSearchDocumentCount?: number | null;

  @Column({ name: 'azure_search_last_error', type: 'text', nullable: true })
  azureSearchLastError?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LabProgress, progress => progress.lab)
  progress!: LabProgress[];
}
