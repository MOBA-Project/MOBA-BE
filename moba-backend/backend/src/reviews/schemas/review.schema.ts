import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  movieId: number;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  dislikes: number;

  // 좋아요를 누른 사용자 ID 목록
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  // 싫어요를 누른 사용자 ID 목록
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dislikedBy: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isSpoiler: boolean;

  // Mongoose가 자동 추가하지만 TS는 몰라서 명시
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// 복합 인덱스 추가 (성능 최적화)
ReviewSchema.index({ movieId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, movieId: 1 }, { unique: true }); // 한 유저당 영화 1개 리뷰만
