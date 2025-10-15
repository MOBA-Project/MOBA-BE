// src/auth/dto/signup-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ example: 'test@example.com', description: '회원 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '12345678', description: '비밀번호 (최소 8자)' })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '홍길동', description: '닉네임' })
  @IsNotEmpty()
  nickname: string;
}
