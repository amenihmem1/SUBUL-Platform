import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsDateString } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed job description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Working location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Type of contract (e.g. CDD, CDI)' })
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiPropertyOptional({ description: 'Salary' })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional({ description: 'Skills required for the job' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Business domain' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'Application deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
