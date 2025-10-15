// src/auth/auth.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { SignupRequestDto } from './dto/signup-request.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async signup(dto: SignupRequestDto): Promise<UserDocument> {
    const { email, password, nickname } = dto;

    const exists = await this.userModel.findOne({ email });
    if (exists) throw new ConflictException('이미 가입된 이메일입니다.');

    const hashed = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      email,
      password: hashed,
      nickname,
    });

    return user; // UserDocument
  }
}
