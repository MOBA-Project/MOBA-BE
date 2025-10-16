import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookmarkDocument = HydratedDocument<Bookmark>;

@Schema({ timestamps: true })
export class Bookmark {
  @Prop({ required: true, ref: 'User' })
  userId: string;

  @Prop({ required: true })
  movieId: number;

  @Prop({ required: true })
  movieTitle: string;

  @Prop()
  moviePoster?: string;

  @Prop()
  movieReleaseDate?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isWatched: boolean;

  @Prop({ default: Date.now })
  bookmarkedAt: Date;

  // TypeScript 타입 정의
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

// 복합 인덱스: 사용자별 영화 중복 방지
BookmarkSchema.index({ userId: 1, movieId: 1 }, { unique: true });
