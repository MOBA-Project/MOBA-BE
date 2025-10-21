import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { TranslationService } from './translation.service';

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, TranslationService],
})
export class MoviesModule {}
