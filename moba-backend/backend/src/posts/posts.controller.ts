import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('영화 감상문 게시판 (Posts)')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '감상문 작성' })
  @ApiResponse({
    status: 201,
    description: '감상문이 성공적으로 작성되었습니다.',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  async createPost(@Req() req, @Body() createPostDto: CreatePostDto) {
    return this.postsService.createPost(req.user._id.toString(), createPostDto);
  }

  @Get()
  @ApiOperation({ summary: '감상문 목록 조회 (페이지네이션)' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수', example: 10 })
  @ApiResponse({
    status: 200,
    description: '감상문 목록이 성공적으로 조회되었습니다.',
  })
  async getPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getPosts(page, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '특정 사용자의 감상문 목록 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수', example: 10 })
  @ApiResponse({
    status: 200,
    description: '사용자의 감상문 목록이 성공적으로 조회되었습니다.',
  })
  @ApiResponse({ status: 400, description: '잘못된 사용자 ID입니다.' })
  async getPostsByUser(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.postsService.getPostsByUser(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '감상문 상세 조회' })
  @ApiParam({ name: 'id', description: '게시물 ID' })
  @ApiResponse({
    status: 200,
    description: '감상문이 성공적으로 조회되었습니다.',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 게시물 ID입니다.' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없습니다.' })
  async getPostById(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '감상문 수정' })
  @ApiParam({ name: 'id', description: '게시물 ID' })
  @ApiResponse({
    status: 200,
    description: '감상문이 성공적으로 수정되었습니다.',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 게시물 ID입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 403, description: '자신의 게시물만 수정할 수 있습니다.' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없습니다.' })
  async updatePost(
    @Param('id') id: string,
    @Req() req,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(id, req.user._id.toString(), updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '감상문 삭제' })
  @ApiParam({ name: 'id', description: '게시물 ID' })
  @ApiResponse({ status: 200, description: '감상문이 성공적으로 삭제되었습니다.' })
  @ApiResponse({ status: 400, description: '잘못된 게시물 ID입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 403, description: '자신의 게시물만 삭제할 수 있습니다.' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없습니다.' })
  async deletePost(@Param('id') id: string, @Req() req) {
    await this.postsService.deletePost(id, req.user._id.toString());
    return { message: 'Post deleted successfully' };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '감상문 좋아요/취소 (토글)' })
  @ApiParam({ name: 'id', description: '게시물 ID' })
  @ApiResponse({
    status: 200,
    description: '좋아요가 성공적으로 처리되었습니다.',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 게시물 ID입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없습니다.' })
  async likePost(@Param('id') id: string, @Req() req) {
    return this.postsService.likePost(id, req.user._id.toString());
  }
}
