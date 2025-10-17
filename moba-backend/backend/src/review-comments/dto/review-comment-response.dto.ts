import { ApiProperty } from '@nestjs/swagger';

export class ReviewCommentResponseDto {
  @ApiProperty({ description: '댓글 ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: '리뷰 ID', example: '507f1f77bcf86cd799439012' })
  reviewId: string;

  @ApiProperty({ description: '작성자 ID', example: '507f1f77bcf86cd799439013' })
  userId: string;

  @ApiProperty({ description: '댓글 내용', example: '정말 공감되는 리뷰네요!' })
  content: string;

  @ApiProperty({ description: '스포일러 여부', example: false })
  isSpoiler: boolean;

  @ApiProperty({ description: '부모 댓글 ID (루트면 null)', example: null, nullable: true })
  parentId: string | null;

  @ApiProperty({ description: '좋아요한 사용자 ID 목록', example: ['507f1f77bcf86cd799439014'] })
  likesBy: string[];

  @ApiProperty({ description: '싫어요한 사용자 ID 목록', example: [] })
  dislikesBy: string[];

  @ApiProperty({ description: '생성일시', example: '2025-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '수정일시', example: '2025-01-15T10:30:00.000Z' })
  updatedAt: string;
}

export class ReviewCommentWithRepliesCountDto extends ReviewCommentResponseDto {
  @ApiProperty({ description: '답글 개수', example: 5 })
  repliesCount: number;
}

export class ReviewCommentListResponseDto {
  @ApiProperty({ type: [ReviewCommentResponseDto] })
  items: ReviewCommentResponseDto[];

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 개수', example: 10 })
  limit: number;

  @ApiProperty({ description: '전체 개수', example: 100 })
  total: number;
}

export class ReviewCommentReactionStatusDto {
  @ApiProperty({ description: '좋아요 여부', example: true })
  liked: boolean;

  @ApiProperty({ description: '싫어요 여부', example: false })
  disliked: boolean;
}
