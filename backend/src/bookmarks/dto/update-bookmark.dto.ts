import { IsArray, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookmarkDto {
  @ApiProperty({ description: '사용자 태그', example: ['볼만함', '재관람'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '시청완료 여부', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isWatched?: boolean;
}
