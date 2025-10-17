import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';

export class ProfileLikesDto {
  @ApiProperty({ example: 'u_12345' })
  @IsString()
  userId: string;

  @ApiProperty({ example: [603, 27205, 157336], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  selectedFromCandidates: number[];
}

