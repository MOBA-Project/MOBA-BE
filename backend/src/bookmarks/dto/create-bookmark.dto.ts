import { IsNumber, IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookmarkDto {
  @ApiProperty({ description: 'TMDB 영화 ID', example: 550 })
  @IsNumber()
  movieId: number;

  @ApiProperty({ description: '영화 제목', example: 'Fight Club' })
  @IsString()
  movieTitle: string;

  @ApiProperty({ description: '영화 포스터 URL', example: '/a26cQPRhJPX6GbWfQbvZdrrp9j9.jpg', required: false })
  @IsOptional()
  @IsString()
  moviePoster?: string;

  @ApiProperty({ description: '영화 개봉일', example: '1999-10-15', required: false })
  @IsOptional()
  @IsString()
  movieReleaseDate?: string;

  @ApiProperty({ description: '사용자 태그', example: ['볼만함', '재관람'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '시청완료 여부', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isWatched?: boolean;
}
