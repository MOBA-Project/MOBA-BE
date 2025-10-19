import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT 액세스 토큰' })
  accessToken: string;

  @ApiPropertyOptional({ example: '(쿠키에 설정됨)', description: 'JWT 리프레시 토큰 (HttpOnly 쿠키로 전달)' })
  refreshToken?: string;

  @ApiProperty({ example: 'seongmin123', description: '로그인 아이디' })
  id: string;

  @ApiProperty({ example: '홍길동', description: '닉네임' })
  nickname: string;
}
