import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewCommentDocument = HydratedDocument<ReviewComment>;

@Schema({ timestamps: true })
export class ReviewComment {
  @Prop({ required: true })
  reviewId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ default: false })
  isSpoiler: boolean;

  // 부모 댓글 ID (루트면 null, 답글이면 루트 댓글의 _id)
  @Prop({ type: Types.ObjectId, ref: 'ReviewComment', default: null })
  parentId: Types.ObjectId | null;

  // 좋아요 수
  @Prop({ default: 0 })
  likes: number;

  // 좋아요를 누른 사용자 ID 목록
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likesBy: Types.ObjectId[];

  // 싫어요 수
  @Prop({ default: 0 })
  dislikes: number;

  // 싫어요를 누른 사용자 ID 목록
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dislikesBy: Types.ObjectId[];

  // Mongoose가 자동 추가하지만 TS는 몰라서 명시
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReviewCommentSchema = SchemaFactory.createForClass(ReviewComment);

// 복합 인덱스 추가 (성능 최적화)
ReviewCommentSchema.index({ reviewId: 1, createdAt: -1 });
ReviewCommentSchema.index({ reviewId: 1, parentId: 1 });
ReviewCommentSchema.index({ userId: 1 });
ReviewCommentSchema.index({ reviewId: 1, likes: -1 }); // 좋아요순 정렬용
