import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, maxlength: 500 })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parentCommentId?: Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// 인덱스 설정
CommentSchema.index({ postId: 1, createdAt: 1 }); // 게시물별 댓글 조회 최적화
CommentSchema.index({ parentCommentId: 1, createdAt: 1 }); // 대댓글 조회 최적화
CommentSchema.index({ userId: 1 }); // 사용자별 댓글 조회
