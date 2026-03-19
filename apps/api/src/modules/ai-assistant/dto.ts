import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const AI_SCOPES = ['GLOBAL', 'TASK'] as const;
const AI_OPERATION_TYPES = [
  'CREATE_LIST',
  'UPDATE_LIST',
  'CREATE_TASK',
  'UPDATE_TASK',
  'DELETE_TASK',
  'CREATE_SUBTASK',
  'UPDATE_SUBTASK',
  'DELETE_SUBTASK',
] as const;

export class AiPlanContextDto {
  @ApiPropertyOptional({ description: 'Explicit list of list IDs relevant to the planning context.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listIds?: string[];

  @ApiPropertyOptional({ description: 'Explicit list of task IDs relevant to the planning context.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiPropertyOptional({ description: 'Optional search query to narrow task context.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  search?: string;

  @ApiPropertyOptional({ description: 'Maximum number of tasks to include in the AI context.', minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreateAiPlanDto {
  @ApiProperty({ example: 'Создай список Работа и добавь туда задачу Подготовить демо на завтра' })
  @IsString()
  @MinLength(1)
  prompt!: string;

  @ApiPropertyOptional({ enum: AI_SCOPES, default: 'GLOBAL' })
  @IsOptional()
  @IsEnum(AI_SCOPES)
  scope?: 'GLOBAL' | 'TASK';

  @ApiPropertyOptional({ description: 'Task-scoped planning target. Required for TASK scope.' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ type: () => AiPlanContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiPlanContextDto)
  context?: AiPlanContextDto;
}

export class ConfirmAiOperationDto {
  @ApiPropertyOptional({ description: 'Optional approval note from the user.' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UndoAiOperationDto {
  @ApiPropertyOptional({ description: 'Optional reason for undoing the AI operation.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AiTaskPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  listId?: string | null;
}

export class AiSubtaskPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export class AiOperationItemDto {
  @ApiProperty({ enum: AI_OPERATION_TYPES })
  @IsIn(AI_OPERATION_TYPES)
  type!: (typeof AI_OPERATION_TYPES)[number];

  @ApiProperty({ description: 'Stable client-visible operation key inside the plan.' })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiPropertyOptional({ description: 'Existing list ID for mutations that target a list.' })
  @IsOptional()
  @IsString()
  listId?: string;

  @ApiPropertyOptional({ description: 'Existing task ID for mutations that target a task.' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Existing subtask ID for mutations that target a subtask.' })
  @IsOptional()
  @IsString()
  subtaskId?: string;

  @ApiPropertyOptional({ description: 'Name of a new or updated list.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: 'Task payload for create/update task operations.', type: () => AiTaskPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiTaskPatchDto)
  task?: AiTaskPatchDto;

  @ApiPropertyOptional({ description: 'Subtask payload for create/update subtask operations.', type: () => AiSubtaskPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiSubtaskPatchDto)
  subtask?: AiSubtaskPatchDto;
}

export class ReviseAiPlanDto {
  @ApiProperty({ description: 'Human-edited markdown or notes that should revise the pending plan.' })
  @IsString()
  @MinLength(1)
  revisionPrompt!: string;

  @ApiPropertyOptional({ description: 'Optional explicit replacement operations authored by the client.', type: () => [AiOperationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiOperationItemDto)
  operations?: AiOperationItemDto[];

  @ApiPropertyOptional({ description: 'Optional arbitrary metadata attached to the revision request.' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
