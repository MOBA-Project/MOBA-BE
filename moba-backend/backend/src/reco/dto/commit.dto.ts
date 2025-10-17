import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, ArrayUnique } from 'class-validator';

export class CommitDto {
  @ApiProperty({ example: 'user_123' })
  @IsString()
  userId!: string;

  @ApiProperty({ type: [Number], required: false })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  favoriteGenres?: number[] = [];

  @ApiProperty({ type: [Number], required: false })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  likes?: number[] = [];

  @ApiProperty({ type: [Number], required: false })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  dislikes?: number[] = [];
}

