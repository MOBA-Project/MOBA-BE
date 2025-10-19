import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovieDocument = HydratedDocument<Movie>;

@Schema({ timestamps: true })
export class Movie {
  @Prop({ required: true, unique: true })
  movieId: number;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [Number], default: [] })
  genres: number[]; // TMDB genre IDs

  @Prop()
  overview?: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  cast: string[];

  @Prop()
  director?: string;

  @Prop({ default: 0 })
  voteAverage?: number;

  @Prop({ default: 0 })
  popularity?: number;

  @Prop()
  releaseDate?: string;

  @Prop()
  posterPath?: string;

  @Prop()
  lastSyncedAt?: Date;

  // Unique normalized tokens from text/people/keywords for DF updates
  @Prop({ type: [String], default: [] })
  terms: string[];
}

export const MovieSchema = SchemaFactory.createForClass(Movie);

