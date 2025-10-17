import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: '게시물 제목',
    example: '인셉션 - 현실과 꿈의 경계를 넘나드는 걸작',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: '게시물 본문',
    example: '크리스토퍼 놀란 감독의 인셉션은 꿈과 현실의 경계를 탐험하는 독창적인 작품입니다. 복잡한 구조에도 불구하고 스토리는 명확하고...',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'TMDB 영화 ID',
    example: 27205,
  })
  @IsNumber()
  movieId: number;

  @ApiProperty({
    description: '영화 제목',
    example: '인셉션',
  })
  @IsString()
  movieTitle: string;

  @ApiProperty({
    description: '영화 포스터 이미지 URL',
    example: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  moviePoster?: string;

  @ApiProperty({
    description: '영화 평점 (1-5점)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}
