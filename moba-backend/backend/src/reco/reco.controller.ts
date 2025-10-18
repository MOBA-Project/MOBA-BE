import { Body, Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecoService } from './reco.service';
import { ProfileGenresDto } from './dto/profile-genres.dto';
import { ProfileLikesDto } from './dto/profile-likes.dto';
import { JobsService } from './jobs.service';
import { FeedbackDto } from './dto/feedback.dto';
import { PreviewDto } from './dto/preview.dto';
import { CommitDto } from './dto/commit.dto';

@ApiTags('Recommendations')
@Controller('v1')
export class RecoController {
  constructor(private readonly recoService: RecoService, private readonly jobs: JobsService) {}

  @Post('profile/genres')
  @ApiOperation({ summary: '?�로???�호 ?�르 ?�??갱신' })
  async saveFavoriteGenres(@Body() dto: ProfileGenresDto) {
    const res = await this.recoService.upsertFavoriteGenres(dto.userId, dto.favoriteGenres);
    return { userId: res.userId, favoriteGenres: res.favoriteGenres };
  }

  @Post('profile/likes')
  @ApiOperation({ summary: '?�보 리스?�에???�택/좋아?�한 ?�화 기록' })
  async saveLikes(@Body() dto: ProfileLikesDto) {
    const res = await this.recoService.addLikes(dto.userId, dto.selectedFromCandidates);
    return { userId: res.userId, likedMovieIds: res.likedMovieIds };
  }

  @Get('reco/candidates')
  @ApiOperation({ summary: '?�르 기반 ?�보 조회 (TMDB discover)' })
  @ApiQuery({ name: 'genres', required: false, example: '28,878,53', description: 'TMDB ?�르 ID CSV' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  async candidates(@Query('genres') genres?: string, @Query('page') page = 1, @Query('size') size = 20) {
    const genreIds = (genres || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    return this.recoService.getCandidates(genreIds, Number(page) || 1, Number(size) || 20);
  }

  @Get('reco/personal')
  @ApiOperation({ summary: '개인??추천 결과 조회' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  async personal(@Query('userId') userId: string, @Query('size') size = 20) {
    return this.recoService.getPersonal(userId, Number(size) || 20);
  }

  @Get('reco/jobs/:id')
  @ApiOperation({ summary: '추천 백그?�운?????�태 조회' })
  async jobStatus(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) return { status: 'not_found' };
    return { id: job.id, status: job.status, updatedAt: job.updatedAt };
  }

  @Post('reco/feedback')
  @ApiOperation({ summary: '추천 ?�드�?�?부?? ?�?? })
  async feedback(@Body() dto: FeedbackDto) {
    return this.recoService.addFeedback(dto);
  }

  @Post('reco/preview')
  @ApiOperation({ summary: '배치??개인??추천 미리보기(?�???�음)' })
  async preview(@Body() dto: PreviewDto) {
    const size = Number(dto.size || 20);
    return this.recoService.previewRecommendations({
      favoriteGenres: dto.favoriteGenres || [],
      likes: dto.likes || [],
      dislikes: dto.dislikes || [],
      size,
    });
  }

  @Post('reco/commit')
  @ApiOperation({ summary: '?�호 ?�르/좋아???�어???�괄 반영' })
  async commit(@Body() dto: CommitDto) {
    return this.recoService.commitPreferences(dto);
  }
    @Get('reco/logs')
  @ApiOperation({ summary: '최근 추천 이력 조회(검증용)' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async logs(@Query('userId') userId: string, @Query('limit') limit = 20) {
    const lmt = Number(limit) || 20;
    const items = await this.recoService.getRecommendationLogs(userId, lmt);
    return { items };
  }
  @Get('reco/history')
  @ApiOperation({ summary: '최근 추천 이력 조회(검증용)' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async history(@Query('userId') userId: string, @Query('limit') limit = 20) {
    const lmt = Number(limit) || 20;
    const items = await this.recoService.getRecommendationLogs(userId, lmt);
    return { items };
  }
} 