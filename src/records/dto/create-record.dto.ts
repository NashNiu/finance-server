import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  IsDateString,
} from 'class-validator';
import { RecordType } from '@prisma/client';

export class CreateRecordDto {
  @IsInt()
  categoryId!: number;

  @IsEnum(RecordType)
  type!: RecordType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;

  @IsDateString()
  recordDate!: string; // ISO date, e.g. "2026-06-15"
}
