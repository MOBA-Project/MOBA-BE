import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'seongmin123', description: '로그인 아이디' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: '12345678', description: '비밀번호' })
  @IsNotEmpty()
  password: string;
}
