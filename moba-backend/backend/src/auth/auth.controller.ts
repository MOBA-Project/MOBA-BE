import { 
  Body, Controller, Get, Post, Put, UseGuards, Req, ConflictException, BadRequestException 
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
}
