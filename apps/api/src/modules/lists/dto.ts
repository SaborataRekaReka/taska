import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateListDto {
  @ApiProperty({ example: 'Учёба' })
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateListDto {
  @ApiPropertyOptional({ example: 'Учёба 2.0' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
