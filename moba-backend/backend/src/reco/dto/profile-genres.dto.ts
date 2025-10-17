import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';

export class ProfileGenresDto {
  @ApiProperty({ example: 'u_12345' })
  @IsString()
  userId: string;

  @ApiProperty({ example: [28, 878, 53], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  favoriteGenres: number[];
}

