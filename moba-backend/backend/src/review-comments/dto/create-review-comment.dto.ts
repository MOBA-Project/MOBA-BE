import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, IsMongoId } from 'class-validator';

export class CreateReviewCommentDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '정말 공감되는 리뷰네요!',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우). 답글의 답글도 자동으로 루트에 붙습니다.',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  parentCommentId?: string;

  @ApiProperty({
    description: '스포일러 여부',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSpoiler?: boolean;
}
