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
}

export const RecoLogSchema = SchemaFactory.createForClass(RecoLog);
RecoLogSchema.index({ userId: 1, createdAt: -1 });

