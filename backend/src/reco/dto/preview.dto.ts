import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class PreviewDto {
  @ApiProperty({ type: [Number], required: false, description: '선호 장르 ID 배열' })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  favoriteGenres?: number[] = [];

  @ApiProperty({ type: [Number], required: false, description: '좋아요한 영화 ID들' })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  likes?: number[] = [];

  @ApiProperty({ type: [Number], required: false, description: '싫어요한 영화 ID들' })
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @IsOptional()
  dislikes?: number[] = [];

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  size?: number = 20;
}

