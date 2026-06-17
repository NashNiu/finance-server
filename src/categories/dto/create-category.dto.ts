import { IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { RecordType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 10)
  name!: string;

  @IsString()
  @Length(1, 30)
  icon!: string;

  @IsEnum(RecordType)
  type!: RecordType;

  // null/omitted = first-level (一级分类); set = subcategory under this parent.
  @IsOptional()
  @IsInt()
  parentId?: number;
}
