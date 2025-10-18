import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

@ApiTags('Bookmarks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @ApiOperation({ summary: '북마크 추가' })
  async create(@Req() req, @Body() dto: CreateBookmarkDto) {
    const userId = req.user.id || req.user._id?.toString();
    console.log('🔍 [Bookmark Create] userId:', userId, 'user object:', req.user);
    return this.bookmarksService.createBookmark(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 북마크 목록' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAll(@Req() req, @Query('page') page = 1, @Query('limit') limit = 10) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.getUserBookmarks(userId, Number(page), Number(limit));
  }

  @Get('watched')
  @ApiOperation({ summary: '시청완료 북마크 목록' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async watched(@Req() req, @Query('page') page = 1, @Query('limit') limit = 10) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.getWatchedBookmarks(userId, Number(page), Number(limit));
  }

  @Get('tags')
  @ApiOperation({ summary: '내 태그 목록' })
  async tags(@Req() req) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.getUserTags(userId);
  }

  @Get('status/:movieId')
  @ApiOperation({ summary: '특정 영화 북마크 상태' })
  async status(@Req() req, @Param('movieId') movieId: string) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.getBookmarkStatus(userId, Number(movieId));
  }

  // 다건 상태 조회: /bookmarks/status?movieIds=1,2,3
  @Get('status')
  @ApiOperation({ summary: '여러 영화 북마크 상태' })
  @ApiQuery({ name: 'movieIds', required: true, example: '1156594,1072699,1038392', description: 'TMDB 영화 ID CSV' })
  async statusBulk(@Req() req, @Query('movieIds') movieIds: string) {
    const userId = req.user.id || req.user._id?.toString();
    const ids = (movieIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    const results = await Promise.all(ids.map((id) => this.bookmarksService.getBookmarkStatus(userId, id)));
    return ids.map((id, idx) => ({ movieId: id, isBookmarked: results[idx].isBookmarked }));
  }

  @Get(':id')
  @ApiOperation({ summary: '북마크 상세' })
  async findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.getBookmarkById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '북마크 수정' })
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateBookmarkDto) {
    const userId = req.user.id || req.user._id?.toString();
    return this.bookmarksService.updateBookmark(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '북마크 삭제' })
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.id || req.user._id?.toString();
    await this.bookmarksService.deleteBookmark(id, userId);
    return { message: '북마크가 삭제되었습니다.' };
  }
}


