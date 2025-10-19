import { ApiProperty } from '@nestjs/swagger';

export class BookmarkResponseDto {
  @ApiProperty({ description: '북마크 ID' })
  _id: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: 'TMDB 영화 ID', example: 550 })
  movieId: number;

  @ApiProperty({ description: '영화 제목', example: 'Fight Club' })
  movieTitle: string;

  @ApiProperty({ description: '영화 포스터 URL', example: '/a26cQPRhJPX6GbWfQbvZdrrp9j9.jpg' })
  moviePoster?: string;

  @ApiProperty({ description: '영화 개봉일', example: '1999-10-15' })
  movieReleaseDate?: string;

  @ApiProperty({ description: '사용자 태그', example: ['볼만함', '재관람'] })
  tags: string[];

  @ApiProperty({ description: '시청완료 여부', example: false })
  isWatched: boolean;

  @ApiProperty({ description: '북마크한 날짜' })
  bookmarkedAt: Date;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}
