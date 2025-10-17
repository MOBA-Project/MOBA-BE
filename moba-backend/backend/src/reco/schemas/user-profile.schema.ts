import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserProfileDocument = HydratedDocument<UserProfile>;

@Schema({ timestamps: true })
export class UserProfile {
  // 로그인 시 사용되는 사용자 id (User.id)
  @Prop({ required: true, unique: true })
  userId: string;

  // TMDB 장르 ID 배열
  @Prop({ type: [Number], default: [] })
  favoriteGenres: number[];

  // 선택: 좋아하는 배우/감독/키워드 (MVP에서는 사용 선택)
  @Prop({ type: [String], default: [] })
  favoritePeople: string[];

  @Prop({ type: [String], default: [] })
  favoriteKeywords: string[];

  // 사용자가 좋아요/선택한 영화 ID 보관(간단 캐시)
  @Prop({ type: [Number], default: [] })
  likedMovieIds: number[];
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

