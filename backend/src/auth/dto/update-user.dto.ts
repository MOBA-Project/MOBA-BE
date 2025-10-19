import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: '새로운 닉네임', required: false })
  @IsOptional() //선택
  nickname?: string;

  @ApiProperty({ example: '현재 비밀번호', required: true })
  @IsNotEmpty()
  currentPw: string;

  @ApiProperty({ example: '새 비밀번호', required: false })
  @IsOptional()
  @MinLength(8)
  newPw?: string;
}
