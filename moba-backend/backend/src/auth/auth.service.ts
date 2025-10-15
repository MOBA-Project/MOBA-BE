import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { SignupRequestDto } from './dto/signup-request.dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async signup(dto: SignupRequestDto): Promise<User> {
    const { email, password, nickname } = dto;

    // 이미 존재하는 이메일인지 확인
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 새 유저 생성
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      nickname,
    });

    return newUser.save();
  }
}
