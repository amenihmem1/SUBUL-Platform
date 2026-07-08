import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class CompleteLessonDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  moduleOrder!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  lessonOrder!: number;
}
