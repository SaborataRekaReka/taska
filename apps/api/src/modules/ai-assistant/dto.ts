import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
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

const DAY_INTENTS = ['LIGHT', 'BALANCED', 'PROGRESS', 'FOCUS', 'CATCH_UP'] as const;
const FOCUS_CAPACITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const STRESS_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const INTERACTION_PREFERENCES = ['SOLO', 'MIXED', 'SOCIAL'] as const;

export class MyDayContextDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'Current mood level used by My Day planning.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  mood?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, description: 'Current energy level used by My Day planning.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  energyLevel?: number;

  @ApiPropertyOptional({ type: () => [String], description: 'Soft preference chips chosen in My Day setup.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wishes?: string[];

  @ApiPropertyOptional({ minimum: 15, maximum: 720, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(15)
  @Max(720)
  timeBudgetMinutes?: number | null;

  @ApiPropertyOptional({ enum: DAY_INTENTS, nullable: true })
  @IsOptional()
  @IsEnum(DAY_INTENTS)
  dayIntent?: (typeof DAY_INTENTS)[number] | null;

  @ApiPropertyOptional({ enum: FOCUS_CAPACITIES, nullable: true })
  @IsOptional()
  @IsEnum(FOCUS_CAPACITIES)
  focusCapacity?: (typeof FOCUS_CAPACITIES)[number] | null;

  @ApiPropertyOptional({ enum: STRESS_LEVELS, nullable: true })
  @IsOptional()
  @IsEnum(STRESS_LEVELS)
  stressLevel?: (typeof STRESS_LEVELS)[number] | null;

  @ApiPropertyOptional({ enum: INTERACTION_PREFERENCES, nullable: true })
  @IsOptional()
  @IsEnum(INTERACTION_PREFERENCES)
  interactionPreference?: (typeof INTERACTION_PREFERENCES)[number] | null;
}

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
  @ApiPropertyOptional({ type: () => MyDayContextDto, description: 'Structured My Day planning context.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MyDayContextDto)
  myDay?: MyDayContextDto;

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
