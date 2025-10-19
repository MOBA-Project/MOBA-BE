import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ example: 'seongmin123', description: '로그인 아이디' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: '12345678', description: '비밀번호 (최소 8자)' })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '홍길동', description: '닉네임' })
  @IsNotEmpty()
  nickname: string;
}
