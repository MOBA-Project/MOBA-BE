import { ApiProperty } from '@nestjs/swagger';

export class CommentAuthorDto {
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

export class CommentResponseDto {
  @ApiProperty({
    description: '댓글 ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: '게시물 ID',
    example: '507f1f77bcf86cd799439012',
  })
  postId: string;

  @ApiProperty({
    description: '댓글 내용',
    example: '정말 공감되는 리뷰네요!',
  })
  content: string;

  @ApiProperty({
    description: '작성자 정보',
    type: CommentAuthorDto,
  })
  author: CommentAuthorDto;

  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우)',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  parentCommentId?: string;

  @ApiProperty({
    description: '대댓글 목록',
    type: [CommentResponseDto],
    required: false,
  })
  replies?: CommentResponseDto[];

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
