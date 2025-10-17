import { Controller, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IngestService } from './ingest.service';

@ApiTags('Admin/Ingest')
@Controller('v1/admin')
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  @Post('sync/discover')
  @ApiOperation({ summary: 'TMDB discover 동기화 (장르 필터, pages)' })
  @ApiQuery({ name: 'genres', required: false, example: '28,878,53' })
  @ApiQuery({ name: 'pages', required: false, example: 2 })
  async syncDiscover(@Query('genres') genres?: string, @Query('pages') pages = 1) {
    const ids = (genres || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    await this.ingest.syncDiscover(ids, Number(pages) || 1);
    return { ok: true };
  }

  @Post('sync/movie/:id')
  @ApiOperation({ summary: '특정 영화 상세/벡터 동기화' })
  async syncMovie(@Param('id') id: string) {
    const movie = await this.ingest.syncMovieById(Number(id));
    return { movieId: movie.movieId, title: movie.title };
  }
}

