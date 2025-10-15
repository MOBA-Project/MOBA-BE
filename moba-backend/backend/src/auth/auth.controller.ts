// src/auth/auth.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup-request.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입', description: '새 사용자를 등록합니다.' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async signup(@Body() dto: SignupRequestDto): Promise<UserResponseDto> {
    const user = await this.authService.signup(dto);

    return {
      _id: user._id?.toString() ?? '',         // ✅ unknown 오류 해결
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt ?? new Date(), // ✅ createdAt 타입 오류 해결
    };
  }
}
