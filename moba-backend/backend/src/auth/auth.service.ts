import { 
  Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { SignupRequestDto } from './dto/signup-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupRequestDto): Promise<UserDocument> {
    const { id, password, nickname } = dto;

    const exists = await this.userModel.findOne({ id });
    if (exists) throw new ConflictException('이미 존재하는 아이디입니다.');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      id,
      password: hashed,
      nickname,
    });

    return user;
  }

  async login(dto: LoginRequestDto): Promise<{ accessToken: string; refreshToken: string; user: UserDocument }> {
    const { id, password } = dto;

    const user = await this.userModel.findOne({ id });
    if (!user) throw new UnauthorizedException('존재하지 않는 아이디입니다.');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const payload = { sub: user._id, id: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '14d' });

    //bcrypt로 해싱 후 DB 저장
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefresh;
    await user.save();
    
  
    return { accessToken, refreshToken, user };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // 토큰 유효성 검증
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.refreshToken) throw new UnauthorizedException('유효하지 않은 사용자입니다.');

      // DB의 해시된 refreshToken과 비교
      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid) throw new UnauthorizedException('리프레시 토큰이 일치하지 않습니다.');

      // 새 Access Token 발급
      const newAccess = this.jwtService.sign({ sub: user._id, id: user.id }, { expiresIn: '1h' });
      return newAccess;
    } catch (err) {
      throw new UnauthorizedException('리프레시 토큰이 만료되었거나 유효하지 않습니다.');
    }
  }

  async checkId(id: string): Promise<boolean> {
    const user = await this.userModel.findOne({ id });
    return !!user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userModel.findOne({ id });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const isNicknameOnly = dto.nickname && !dto.newPw && !dto.currentPw;
    if (!isNicknameOnly) {
      if (!dto.currentPw) throw new BadRequestException('현재 비밀번호를 입력해주세요.');

      const valid = await bcrypt.compare(dto.currentPw, user.password);
      if (!valid) throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');

      if (dto.newPw) user.password = await bcrypt.hash(dto.newPw, 10);
    }

    if (dto.nickname) user.nickname = dto.nickname;
    await user.save();

    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findOneAndDelete({ id });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return true;
  }
}
