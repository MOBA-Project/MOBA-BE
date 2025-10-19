import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VectorTermDocument = HydratedDocument<VectorTerm>;

@Schema({ timestamps: true })
export class VectorTerm {
  @Prop({ required: true, unique: true })
  term: string; // normalized token

  @Prop({ default: 0 })
  df: number; // document frequency
}

export const VectorTermSchema = SchemaFactory.createForClass(VectorTerm);

@Schema({ timestamps: true })
export class VectorMeta {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ default: 0 })
  value: number;
}

export type VectorMetaDocument = HydratedDocument<VectorMeta>;
export const VectorMetaSchema = SchemaFactory.createForClass(VectorMeta);

