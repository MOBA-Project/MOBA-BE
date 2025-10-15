import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { SignupRequestDto } from './dto/signup-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';

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

  async login(dto: LoginRequestDto): Promise<{ accessToken: string; user: UserDocument }> {
    const { id, password } = dto;

    const user = await this.userModel.findOne({ id });
    if (!user) throw new UnauthorizedException('존재하지 않는 아이디입니다.');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const payload = { sub: user._id, id: user.id };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user }; // 유저 정보도 함께 반환
  }

  async checkId(id: string): Promise<boolean> {
    const user = await this.userModel.findOne({ id });
    return !!user; // true면 이미 존재
  }

}
