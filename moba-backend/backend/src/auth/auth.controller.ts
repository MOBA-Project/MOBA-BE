import { 
  Body, Controller, Get, Post, Put, Delete, UseGuards, Req, Res, ConflictException, BadRequestException 
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

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
  async login(@Body() dto: LoginRequestDto, @Res({ passthrough: true }) res): Promise<LoginResponseDto> {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);

    // HttpOnly 쿠키로 refresh 토큰 설정
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // HTTPS 환경 권장
      sameSite: 'lax',
      path: '/auth',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14d
    });

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
    const user = req.user;
    return {
      message: '인증 성공',
      id: user.id,
      nickname: user.nickname,
    };
  }

  @Post('check-id')
  @ApiOperation({ summary: '아이디 중복 확인', description: '입력한 아이디가 사용 가능한지 확인합니다.' })
  @ApiResponse({ status: 200, description: '사용 가능한 아이디입니다.' })
  @ApiResponse({ status: 409, description: '이미 존재하는 아이디입니다.' })
  async checkId(@Body('id') id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('아이디를 입력해주세요.');
    }

    const exists = await this.authService.checkId(id);
    if (exists) {
      throw new ConflictException('이미 존재하는 아이디입니다.');
    }
    return { available: true };
  }

  @Put('update')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원정보 수정', description: '닉네임 또는 비밀번호를 수정합니다.' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateUser(@Req() req, @Body() dto: UpdateUserDto) {
    const userId = req.user.id;
    const updated = await this.authService.updateUser(userId, dto);

    return {
      _id: updated._id?.toString() ?? '',
      id: updated.id,
      nickname: updated.nickname,
      createdAt: updated.createdAt ?? new Date(),
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Access Token 재발급', description: '리프레시 토큰으로 새 액세스 토큰을 발급합니다.' })
  @ApiResponse({ status: 200, description: '새 Access Token 발급 성공' })
  @ApiResponse({ status: 401, description: '리프레시 토큰이 유효하지 않음' })
  async refresh(@Body('refreshToken') refreshToken: string, @Req() req) {
    // 요청 본문이 우선, 없으면 쿠키에서 사용
    const token = refreshToken || req?.cookies?.refreshToken;
    const newAccessToken = await this.authService.refreshAccessToken(token);
    return { accessToken: newAccessToken };
  }

  @Delete('delete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원 탈퇴', description: '현재 로그인된 사용자의 계정을 완전히 삭제합니다.' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
  async deleteUser(@Req() req) {
    const userId = req.user.id;
    await this.authService.deleteUser(userId);
    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
