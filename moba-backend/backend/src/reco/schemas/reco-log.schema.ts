import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RecoLogDocument = HydratedDocument<RecoLog>;

@Schema({ timestamps: true })
export class RecoLog {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  movieId: number;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  position: number;

  @Prop({ default: false })
  interacted: boolean;

  // 추천 당시 스냅샷 필드들
  @Prop()
  title?: string;

  @Prop()
  posterPath?: string;

  @Prop({ type: [Number], default: [] })
  genres?: number[];

  @Prop({ type: [String], default: [] })
  reasons?: string[];

  @Prop({ default: 0 })
  popularity?: number;

  @Prop({ default: 0 })
  voteAverage?: number;

  @Prop()
  releaseDate?: string;

  // 개인추천 등 소스 구분
  @Prop({ enum: ['personal', 'preview', 'other'], default: 'personal' })
  source?: 'personal' | 'preview' | 'other';

  // 추천일자(명시적). timestamps의 createdAt과 동일하게 사용 가능
  @Prop()
  recommendedAt?: Date;
}

export const RecoLogSchema = SchemaFactory.createForClass(RecoLog);
RecoLogSchema.index({ userId: 1, createdAt: -1 });
RecoLogSchema.index({ userId: 1, recommendedAt: -1 });
RecoLogSchema.index({ userId: 1, genres: 1, recommendedAt: -1 });

