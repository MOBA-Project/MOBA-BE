// src/auth/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '66e9488ad52f4b7a...', description: 'MongoDB 사용자 ID' })
  _id: string;

  @ApiProperty({ example: 'test@example.com', description: '회원 이메일' })
  email: string;

  @ApiProperty({ example: '홍길동', description: '닉네임' })
  nickname: string;

  @ApiProperty({ example: '2025-10-15T12:34:56Z', description: '가입일' })
  createdAt: Date;
}
