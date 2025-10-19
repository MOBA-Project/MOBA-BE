import { ApiProperty } from '@nestjs/swagger';

export class ReviewReactionStatusDto {
  @ApiProperty({ example: true, description: '좋아요를 눌렀는지 여부' })
  isLiked: boolean;

  @ApiProperty({ example: false, description: '싫어요를 눌렀는지 여부' })
  isDisliked: boolean;
}
