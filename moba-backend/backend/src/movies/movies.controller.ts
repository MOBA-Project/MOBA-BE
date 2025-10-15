import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Movies') // Swagger에서 그룹으로 표시
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: '영화 목록 가져오기', description: 'TMDB API에서 영화 목록을 조회합니다.' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '페이지 번호 (기본값 1)' })
  @ApiQuery({ name: 'genre', required: false, example: 'action', description: '장르 필터 (예: action, comedy)' })
  getMovies(@Query('page') page?: number, @Query('genre') genre?: string) {
    return this.moviesService.getMovies(page, genre);
  }

  @Get(':id')
  @ApiOperation({ summary: '영화 상세 정보', description: '특정 영화의 상세 정보를 가져옵니다.' })
  @ApiParam({ name: 'id', example: '12345', description: 'TMDB 영화 ID' })
  getMovieDetail(@Param('id') id: string) {
    return this.moviesService.getMovieDetail(id);
  }

  @Get(':id/videos')
  @ApiOperation({ summary: '영화 예고편 조회', description: '특정 영화의 예고편 정보를 가져옵니다.' })
  @ApiParam({ name: 'id', example: '12345', description: 'TMDB 영화 ID' })
  getMovieVideos(@Param('id') id: string) {
    return this.moviesService.getMovieVideos(id);
  }

  @Get('search')
  @ApiOperation({ summary: '영화 검색', description: '검색어를 기준으로 영화 목록을 검색합니다.' })
  @ApiQuery({ name: 'query', example: 'Inception', description: '검색어' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '페이지 번호 (기본값 1)' })
  searchMovies(@Query('query') query: string, @Query('page') page?: number) {
    return this.moviesService.searchMovies(query, page);
  }


}
