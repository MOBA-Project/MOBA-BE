import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecoService } from './reco.service';

@ApiTags('Recommendations')
@Controller('v1')
export class RecoHistoryController {
  constructor(private readonly recoService: RecoService) {}

  @Get('reco/history')
  @ApiOperation({ summary: '최근 추천 이력 조회(필터 지원)' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'period', required: false, example: '7d', description: 'today|7d|30d|all' })
  @ApiQuery({ name: 'genreId', required: false, example: 28, description: 'TMDB 장르 ID' })
  async history(
    @Query('userId') userId: string,
    @Query('limit') limit = 20,
    @Query('period') period?: string,
    @Query('genreId') genreId?: string,
  ) {
    const lmt = Number(limit) || 20;
    const gid = Number(genreId);
    const items = await this.recoService.getRecommendationLogs(userId, lmt, { period, genreId: gid });
    return { items };
  }
}

