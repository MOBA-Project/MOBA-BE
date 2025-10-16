import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: '66e9488ad52f4b7a...', description: '리뷰 ID' })
  _id: string;

  @ApiProperty({ example: '66e9488ad52f4b7a...', description: '작성자 ID' })
  userId: string;

  @ApiProperty({ example: 550, description: 'TMDB 영화 ID' })
  movieId: number;

  @ApiProperty({ example: 4.5, description: '평점 (1-5)' })
  rating: number;

  @ApiProperty({ example: '정말 재미있는 영화였습니다!', description: '리뷰 내용' })
  content: string;

  @ApiProperty({ example: 10, description: '좋아요 수' })
  likes: number;

  @ApiProperty({ example: 2, description: '싫어요 수' })
  dislikes: number;

  @ApiProperty({ example: ['재미있어요', '감동적'], description: '태그 목록', type: [String] })
  tags: string[];

  @ApiProperty({ example: false, description: '스포일러 포함 여부' })
  isSpoiler: boolean;

  @ApiProperty({ example: '2025-10-15T12:34:56Z', description: '작성일' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-15T12:34:56Z', description: '수정일' })
  updatedAt: Date;
}
