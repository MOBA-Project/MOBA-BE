import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsArray, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ example: 4.5, description: '평점 (1-5)', minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: '수정된 리뷰 내용입니다.', description: '리뷰 내용 (최대 1000자)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

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
