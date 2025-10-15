import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';

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
      _id: user._id?.toString() ?? '',
      id: user.id,
      nickname: user.nickname,
      createdAt: user.createdAt ?? new Date(),
    };
  }

  @Post('login')
  @ApiOperation({ summary: '로그인', description: 'JWT 토큰을 발급합니다.' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.authService.login(dto);
  
    return {
      accessToken,
      id: user.id,
      nickname: user.nickname,
    };
  }

}
