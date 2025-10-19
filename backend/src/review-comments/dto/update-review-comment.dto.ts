import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class UpdateReviewCommentDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '수정된 댓글 내용입니다.',
    minLength: 1,
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: '스포일러 여부',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSpoiler?: boolean;
}
