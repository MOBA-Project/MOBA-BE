import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovieVectorDocument = HydratedDocument<MovieVector>;

type TermWeight = { term: string; weight: number };

@Schema({ timestamps: true })
export class MovieVector {
  @Prop({ required: true, unique: true })
  movieId: number;

  // Multi-hot genres (store raw ids for simplicity)
  @Prop({ type: [Number], default: [] })
  genres: number[];

  // Top-N TF-IDF terms
  @Prop({ type: [{ term: String, weight: Number }], default: [] })
  tfidf: TermWeight[];

  // Optional SBERT embedding (mean pooled, L2-normalized)
  @Prop({ type: [Number], default: [] })
  sbert: number[];
}

export const MovieVectorSchema = SchemaFactory.createForClass(MovieVector);
