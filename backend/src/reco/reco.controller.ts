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
  @ApiOperation({ summary: 'Upsert favorite genres' })
  async saveFavoriteGenres(@Body() dto: ProfileGenresDto) {
    const res = await this.recoService.upsertFavoriteGenres(dto.userId, dto.favoriteGenres);
    return { userId: res.userId, favoriteGenres: res.favoriteGenres };
  }

  @Post('profile/likes')
  @ApiOperation({ summary: 'Add likes from candidate list' })
  async saveLikes(@Body() dto: ProfileLikesDto) {
    const res = await this.recoService.addLikes(dto.userId, dto.selectedFromCandidates);
    return { userId: res.userId, likedMovieIds: res.likedMovieIds };
  }

  @Get('reco/candidates')
  @ApiOperation({ summary: 'Fetch genre-based candidates' })
  @ApiQuery({ name: 'genres', required: false, example: '28,878,53', description: 'TMDB genre ID CSV' })
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
  @ApiOperation({ summary: 'Get personal recommendations' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  async personal(@Query('userId') userId: string, @Query('size') size = 20) {
    return this.recoService.getPersonal(userId, Number(size) || 20);
  }

  @Get('reco/jobs/:id')
  @ApiOperation({ summary: 'Recommendation job status' })
  async jobStatus(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) return { status: 'not_found' };
    return { id: job.id, status: job.status, updatedAt: job.updatedAt };
  }

  @Post('reco/feedback')
  @ApiOperation({ summary: 'Save recommendation feedback' })
  async feedback(@Body() dto: FeedbackDto) {
    return this.recoService.addFeedback(dto);
  }

  @Post('reco/preview')
  @ApiOperation({ summary: 'Preview personalized recommendations' })
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
  @ApiOperation({ summary: 'Commit session preferences' })
  async commit(@Body() dto: CommitDto) {
    return this.recoService.commitPreferences(dto);
  }

  @Get('reco/logs')
  @ApiOperation({ summary: 'Fetch recent recommendation logs' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async logs(@Query('userId') userId: string, @Query('limit') limit = 20) {
    const lmt = Number(limit) || 20;
    const items = await this.recoService.getRecommendationLogs(userId, lmt);
    return { items };
  }
}