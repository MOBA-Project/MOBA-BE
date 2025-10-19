import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsMongoId, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: '게시물 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  postId: string;

  @ApiProperty({
    description: '댓글 내용',
    example: '정말 공감되는 리뷰네요! 저도 이 영화를 정말 좋아합니다.',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  parentCommentId?: string;
}
