import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    description: '게시물 제목',
    example: '인셉션 - 현실과 꿈의 경계를 넘나드는 걸작 (수정)',
    minLength: 1,
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    description: '게시물 본문',
    example: '다시 보니 더욱 명확해지는 스토리 구조...',
    minLength: 1,
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;

  @ApiProperty({
    description: '영화 평점 (1-5점)',
    example: 4,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;
}
