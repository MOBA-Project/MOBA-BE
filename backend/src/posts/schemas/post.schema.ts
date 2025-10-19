import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  movieId: number;

  @Prop({ required: true })
  movieTitle: string;

  @Prop()
  moviePoster?: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ default: 0 })
  commentCount: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// 인덱스 설정
PostSchema.index({ userId: 1, createdAt: -1 }); // 사용자별 게시물 조회 최적화
PostSchema.index({ createdAt: -1 }); // 최신순 정렬 최적화
PostSchema.index({ movieId: 1 }); // 영화별 게시물 조회 최적화
