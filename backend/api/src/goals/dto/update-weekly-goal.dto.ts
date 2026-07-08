import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { GoalCategory } from './create-goal.dto';

export class UpdateWeeklyGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalCategory)
  category?: GoalCategory;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  target?: number;
}
