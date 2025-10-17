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
  @ApiOperation({ summary: '프로필 선호 장르 저장/갱신' })
  async saveFavoriteGenres(@Body() dto: ProfileGenresDto) {
    const res = await this.recoService.upsertFavoriteGenres(dto.userId, dto.favoriteGenres);
    return { userId: res.userId, favoriteGenres: res.favoriteGenres };
  }

  @Post('profile/likes')
  @ApiOperation({ summary: '후보 리스트에서 선택/좋아요한 영화 기록' })
  async saveLikes(@Body() dto: ProfileLikesDto) {
    const res = await this.recoService.addLikes(dto.userId, dto.selectedFromCandidates);
    return { userId: res.userId, likedMovieIds: res.likedMovieIds };
  }

  @Get('reco/candidates')
  @ApiOperation({ summary: '장르 기반 후보 조회 (TMDB discover)' })
  @ApiQuery({ name: 'genres', required: false, example: '28,878,53', description: 'TMDB 장르 ID CSV' })
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
  @ApiOperation({ summary: '개인화 추천 결과 조회' })
  @ApiQuery({ name: 'userId', required: true, example: 'u_12345' })
  @ApiQuery({ name: 'size', required: false, example: 20 })
  async personal(@Query('userId') userId: string, @Query('size') size = 20) {
    return this.recoService.getPersonal(userId, Number(size) || 20);
  }

  @Get('reco/jobs/:id')
  @ApiOperation({ summary: '추천 백그라운드 잡 상태 조회' })
  async jobStatus(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) return { status: 'not_found' };
    return { id: job.id, status: job.status, updatedAt: job.updatedAt };
  }

  @Post('reco/feedback')
  @ApiOperation({ summary: '추천 피드백(긍/부정) 저장' })
  async feedback(@Body() dto: FeedbackDto) {
    return this.recoService.addFeedback(dto);
  }

  @Post('reco/preview')
  @ApiOperation({ summary: '배치형 개인화 추천 미리보기(저장 없음)' })
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
  @ApiOperation({ summary: '선호 장르/좋아요/싫어요 일괄 반영' })
  async commit(@Body() dto: CommitDto) {
    return this.recoService.commitPreferences(dto);
  }
}
