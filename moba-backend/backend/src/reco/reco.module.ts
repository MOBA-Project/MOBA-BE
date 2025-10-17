import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecoController } from './reco.controller';
import { RecoService } from './reco.service';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { JobsService } from './jobs.service';
import { SbertService } from './embeddings/sbert.service';
import { Movie, MovieSchema } from '../movies/schemas/movie.schema';
import { MovieVector, MovieVectorSchema } from './schemas/movie-vector.schema';
import { VectorMeta, VectorMetaSchema, VectorTerm, VectorTermSchema } from './schemas/vector-term.schema';
import { RecoLog, RecoLogSchema } from './schemas/reco-log.schema';
import { UserFeedback, UserFeedbackSchema } from './schemas/user-feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: Movie.name, schema: MovieSchema },
      { name: MovieVector.name, schema: MovieVectorSchema },
      { name: VectorTerm.name, schema: VectorTermSchema },
      { name: VectorMeta.name, schema: VectorMetaSchema },
      { name: RecoLog.name, schema: RecoLogSchema },
      { name: UserFeedback.name, schema: UserFeedbackSchema },
    ]),
  ],
  controllers: [RecoController, IngestController],
  providers: [RecoService, IngestService, JobsService, SbertService],
})
export class RecoModule {}
