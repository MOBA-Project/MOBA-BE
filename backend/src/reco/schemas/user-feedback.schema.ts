import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserFeedbackDocument = HydratedDocument<UserFeedback>;

@Schema({ timestamps: true })
export class UserFeedback {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  movieId: number;

  // 1=positive(like/watch), 0=negative(skip/unlike)
  @Prop({ required: true, enum: [0, 1] })
  label: 0 | 1;

  @Prop({ enum: ['like', 'click', 'watch', 'skip'], default: 'like' })
  source: 'like' | 'click' | 'watch' | 'skip';
}

export const UserFeedbackSchema = SchemaFactory.createForClass(UserFeedback);
UserFeedbackSchema.index({ userId: 1, createdAt: -1 });
UserFeedbackSchema.index({ userId: 1, movieId: 1 });

