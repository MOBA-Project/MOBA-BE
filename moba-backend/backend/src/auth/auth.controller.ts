import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  @Get('protected')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'JWT 인증 확인', description: '로그인된 사용자 정보를 반환합니다.' })
  @ApiResponse({ status: 200, description: '인증 성공' })
  async getProtected(@Req() req) {
    const user = req.user; // JwtStrategy.validate()에서 반환된 user
    return {
      message: `인증 성공`,
      id: user.id,
      nickname: user.nickname,
    };
  }

}
