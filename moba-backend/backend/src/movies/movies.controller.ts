import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  getMovies(@Query('page') page?: number, @Query('genre') genre?: string) {
    return this.moviesService.getMovies(page, genre);
  }

  @Get(':id')
  getMovieDetail(@Param('id') id: string) {
    return this.moviesService.getMovieDetail(id);
  }

  @Get(':id/videos')
  getMovieVideos(@Param('id') id: string) {
    return this.moviesService.getMovieVideos(id);
  }

  @Get('search/query')
  searchMovies(@Query('query') query: string, @Query('page') page?: number) {
    return this.moviesService.searchMovies(query, page);
  }
}
