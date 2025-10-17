import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsIn } from 'class-validator';

export class FeedbackDto {
  @ApiProperty({ example: 'u_12345' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 603 })
  @IsInt()
  movieId: number;

  @ApiProperty({ example: 1, description: '1=positive, 0=negative' })
  @IsIn([0, 1])
  label: 0 | 1;

  @ApiProperty({ example: 'like', description: 'like|click|watch|skip' })
  @IsIn(['like', 'click', 'watch', 'skip'])
  source: 'like' | 'click' | 'watch' | 'skip';
}

