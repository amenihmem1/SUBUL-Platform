import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitExamDto {
  @ApiProperty({
    description: 'Map of exam question id (string) to selected option id (e.g. A, B, C, D)',
    example: { '1': 'B', '2': 'A' },
  })
  @IsObject()
  answers!: Record<string, string>;

  @ApiPropertyOptional({ example: '42 min' })
  @IsOptional()
  @IsString()
  timeSpent?: string;
}
