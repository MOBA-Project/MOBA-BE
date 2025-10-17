import { ApiProperty } from '@nestjs/swagger';

export class PostAuthorDto {
  @ApiProperty({
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: '사용자명',
    example: 'moviefan123',
  })
  id: string;

  @ApiProperty({
    description: '닉네임',
    example: '영화광',
  })
  nickname: string;
}

export class PostResponseDto {
  @ApiProperty({
    description: '게시물 ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: '게시물 제목',
    example: '인셉션 - 현실과 꿈의 경계를 넘나드는 걸작',
  })
  title: string;

  @ApiProperty({
    description: '게시물 본문',
    example: '크리스토퍼 놀란 감독의 인셉션은 꿈과 현실의 경계를 탐험하는 독창적인 작품입니다...',
  })
  content: string;

  @ApiProperty({
    description: 'TMDB 영화 ID',
    example: 27205,
  })
  movieId: number;

  @ApiProperty({
    description: '영화 제목',
    example: '인셉션',
  })
  movieTitle: string;

  @ApiProperty({
    description: '영화 포스터 이미지 URL',
    example: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    required: false,
  })
  moviePoster?: string;

  @ApiProperty({
    description: '영화 평점 (1-5점)',
    example: 5,
  })
  rating: number;

  @ApiProperty({
    description: '작성자 정보',
    type: PostAuthorDto,
  })
  author: PostAuthorDto;

  @ApiProperty({
    description: '좋아요 수',
    example: 42,
  })
  likes: number;

  @ApiProperty({
    description: '댓글 수',
    example: 15,
  })
  commentCount: number;

  @ApiProperty({
    description: '현재 사용자의 좋아요 여부',
    example: true,
    required: false,
  })
  isLiked?: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2025-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2025-01-15T12:45:00.000Z',
  })
  updatedAt: Date;
}
