import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('영화 감상문 댓글 (Comments)')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글/대댓글 작성' })
  @ApiResponse({
    status: 201,
    description: '댓글이 성공적으로 작성되었습니다.',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 404, description: '게시물 또는 부모 댓글을 찾을 수 없습니다.' })
  async createComment(@Req() req, @Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.createComment(
      req.user._id.toString(),
      createCommentDto,
    );
  }

  @Get('post/:postId')
  @ApiOperation({ summary: '게시물의 댓글 목록 조회 (대댓글 포함)' })
  @ApiParam({ name: 'postId', description: '게시물 ID' })
  @ApiResponse({
    status: 200,
    description: '댓글 목록이 성공적으로 조회되었습니다.',
    type: [CommentResponseDto],
  })
  @ApiResponse({ status: 400, description: '잘못된 게시물 ID입니다.' })
  @ApiResponse({ status: 404, description: '게시물을 찾을 수 없습니다.' })
  async getCommentsByPost(@Param('postId') postId: string) {
    return this.commentsService.getCommentsByPost(postId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 수정' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({
    status: 200,
    description: '댓글이 성공적으로 수정되었습니다.',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 댓글 ID입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 403, description: '자신의 댓글만 수정할 수 있습니다.' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없습니다.' })
  async updateComment(
    @Param('id') id: string,
    @Req() req,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(
      id,
      req.user._id.toString(),
      updateCommentDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 삭제 (대댓글도 함께 삭제)' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글이 성공적으로 삭제되었습니다.' })
  @ApiResponse({ status: 400, description: '잘못된 댓글 ID입니다.' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자입니다.' })
  @ApiResponse({ status: 403, description: '자신의 댓글만 삭제할 수 있습니다.' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없습니다.' })
  async deleteComment(@Param('id') id: string, @Req() req) {
    await this.commentsService.deleteComment(id, req.user._id.toString());
    return { message: 'Comment deleted successfully' };
  }
}
