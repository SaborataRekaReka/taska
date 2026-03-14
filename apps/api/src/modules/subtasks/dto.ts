import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 'Research options' })
  @IsString()
  @MinLength(1)
  title!: string;
}

export class UpdateSubtaskDto {
  @ApiPropertyOptional({ example: 'Research options v2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ enum: ['TODO', 'IN_PROGRESS', 'DONE'] })
  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE'] as const)
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}
