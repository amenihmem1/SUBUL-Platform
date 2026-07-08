import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsBoolean, IsObject, IsNumber } from 'class-validator';

export class UpdateLabProgressDto {
  @ApiPropertyOptional({ example: [0, 1, 2], description: 'Indices of completed tasks' })
  @IsOptional()
  @IsArray()
  completedTasks?: number[];

  @ApiPropertyOptional({ example: true, description: 'Whether the lab is completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Notes (taskNotes, generalNotes)' })
  @IsOptional()
  @IsObject()
  notes?: {
    taskNotes?: { [key: number]: string };
    generalNotes?: string;
    quizScore?: number;
    quizTotal?: number;
    quizCompletedAt?: string;
  };

  @ApiPropertyOptional({ example: 120, description: 'Time spent in seconds' })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}
