import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsBoolean, IsArray, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 550, description: 'TMDB 영화 ID' })
  @IsNotEmpty()
  @IsNumber()
  movieId: number;

  @ApiProperty({ example: 4.5, description: '평점 (1-5)', minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: '정말 재미있는 영화였습니다!', description: '리뷰 내용 (최대 1000자)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    example: ['재미있어요', '감동적'],
    description: '태그 목록',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: false, description: '스포일러 포함 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isSpoiler?: boolean;
}
