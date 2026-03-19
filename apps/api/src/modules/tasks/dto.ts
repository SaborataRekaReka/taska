import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Buy groceries' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ example: 'Milk, eggs, bread' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ example: '2026-03-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Buy groceries and snacks' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ enum: ['TODO', 'IN_PROGRESS', 'DONE'] })
  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE'] as const)
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listId?: string | null;

  @ApiPropertyOptional({ description: 'Set to true to add task to My Day' })
  @IsOptional()
  @IsBoolean()
  isMyDay?: boolean;
}

export class TaskQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional({ enum: ['TODO', 'IN_PROGRESS', 'DONE'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter tasks due today' })
  @IsOptional()
  @IsString()
  dueToday?: string;

  @ApiPropertyOptional({ description: 'Filter tasks with no list' })
  @IsOptional()
  @IsString()
  noList?: string;

  @ApiPropertyOptional({ description: 'Search in title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['OVERDUE', 'TODAY', 'NEXT_24_HOURS'], description: 'Filter by urgency' })
  @IsOptional()
  @IsString()
  urgency?: string;
}
