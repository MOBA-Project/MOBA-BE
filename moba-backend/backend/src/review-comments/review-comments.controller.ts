import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewCommentsService } from './review-comments.service';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { UpdateReviewCommentDto } from './dto/update-review-comment.dto';
import {
  ReviewCommentResponseDto,
  ReviewCommentWithRepliesCountDto,
  ReviewCommentListResponseDto,
  ReviewCommentReactionStatusDto,
} from './dto/review-comment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('리뷰 댓글 (Review Comments)')
@Controller('reviews/:reviewId/comments')
export class ReviewCommentsController {
  constructor(private readonly reviewCommentsService: ReviewCommentsService) {}

  @Get()
  @ApiOperation({
    summary: '리뷰 댓글 목록 조회',
    description:
      'parentId가 없으면 루트 댓글 목록, 있으면 특정 루트 댓글의 답글 목록을 조회합니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiQuery({ name: 'parentId', required: false, description: '부모 댓글 ID (답글 조회시)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '페이지 번호 (기본값 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: '페이지당 개수 (기본값 10, 최대 50)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['recent', 'likes'],
    example: 'recent',
    description: '정렬 기준 (recent | likes, 기본값 recent)',
  })
  @ApiResponse({ status: 200, type: ReviewCommentListResponseDto })
  async getComments(
    @Param('reviewId') reviewId: string,
    @Query('parentId') parentId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('sort', new DefaultValuePipe('recent')) sort: 'recent' | 'likes' = 'recent',
  ) {
    const result = await this.reviewCommentsService.getCommentsByReview(
      reviewId,
      parentId,
      page,
      limit,
      sort,
    );

    // 루트 댓글인 경우 repliesCount 추가
    if (!parentId) {
      const itemsWithRepliesCount = await Promise.all(
        result.items.map(async (comment) => {
          const repliesCount = await this.reviewCommentsService.getRepliesCount(comment._id!);
          return {
            id: comment._id?.toString() ?? '',
            reviewId: comment.reviewId,
            userId: comment.userId.toString(),
            content: comment.content,
            isSpoiler: comment.isSpoiler,
            parentId: comment.parentId?.toString() ?? null,
            likesBy: comment.likesBy.map((id) => id.toString()),
            dislikesBy: comment.dislikesBy.map((id) => id.toString()),
            createdAt: comment.createdAt?.toISOString() ?? '',
            updatedAt: comment.updatedAt?.toISOString() ?? '',
            repliesCount,
          };
        }),
      );

      return {
        items: itemsWithRepliesCount,
        page: result.page,
        limit: result.limit,
        total: result.total,
      };
    }

    // 답글인 경우
    const items = result.items.map((comment) => ({
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    }));

    return {
      items,
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '리뷰 댓글 작성',
    description: 'parentCommentId가 없으면 루트 댓글, 있으면 답글로 작성됩니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 201, type: ReviewCommentResponseDto })
  async createComment(
    @Param('reviewId') reviewId: string,
    @Req() req,
    @Body() dto: CreateReviewCommentDto,
  ): Promise<ReviewCommentResponseDto> {
    const userId = req.user._id;
    const comment = await this.reviewCommentsService.createComment(reviewId, userId, dto);

    return {
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    };
  }

  @Get(':commentId/reaction')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '댓글 좋아요/싫어요 상태 조회',
    description: '현재 로그인한 사용자가 해당 댓글에 좋아요 또는 싫어요를 눌렀는지 확인합니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, type: ReviewCommentReactionStatusDto })
  async getReactionStatus(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
  ): Promise<ReviewCommentReactionStatusDto> {
    const userId = req.user._id;
    return this.reviewCommentsService.getReactionStatus(reviewId, commentId, userId);
  }

  @Post(':commentId/react')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '댓글 좋아요 토글',
    description: '좋아요를 누르면 좋아요 추가, 다시 누르면 취소됩니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, type: ReviewCommentResponseDto })
  async reactToComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
    @Body() body: { type: 'like' },
  ): Promise<ReviewCommentResponseDto> {
    const userId = req.user._id;
    const comment = await this.reviewCommentsService.likeComment(reviewId, commentId, userId);

    return {
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    };
  }

  @Post(':commentId/like')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '댓글 좋아요',
    description: '댓글에 좋아요를 누릅니다. 이미 누른 경우 취소됩니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, type: ReviewCommentResponseDto })
  async likeComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
  ): Promise<ReviewCommentResponseDto> {
    const userId = req.user._id;
    const comment = await this.reviewCommentsService.likeComment(reviewId, commentId, userId);

    return {
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    };
  }

  @Post(':commentId/dislike')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '댓글 싫어요',
    description: '댓글에 싫어요를 누릅니다. 이미 누른 경우 취소됩니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, type: ReviewCommentResponseDto })
  async dislikeComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
  ): Promise<ReviewCommentResponseDto> {
    const userId = req.user._id;
    const comment = await this.reviewCommentsService.dislikeComment(reviewId, commentId, userId);

    return {
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    };
  }

  @Put(':commentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '댓글 수정', description: '본인이 작성한 댓글을 수정합니다.' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, type: ReviewCommentResponseDto })
  async updateComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
    @Body() dto: UpdateReviewCommentDto,
  ): Promise<ReviewCommentResponseDto> {
    const userId = req.user._id;
    const comment = await this.reviewCommentsService.updateComment(
      reviewId,
      commentId,
      userId,
      dto,
    );

    return {
      id: comment._id?.toString() ?? '',
      reviewId: comment.reviewId,
      userId: comment.userId.toString(),
      content: comment.content,
      isSpoiler: comment.isSpoiler,
      parentId: comment.parentId?.toString() ?? null,
      likesBy: comment.likesBy.map((id) => id.toString()),
      dislikesBy: comment.dislikesBy.map((id) => id.toString()),
      createdAt: comment.createdAt?.toISOString() ?? '',
      updatedAt: comment.updatedAt?.toISOString() ?? '',
    };
  }

  @Delete(':commentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '댓글 삭제',
    description: '본인이 작성한 댓글을 삭제합니다. 루트 댓글 삭제시 모든 답글도 함께 삭제됩니다.',
  })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  async deleteComment(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Req() req,
  ) {
    const userId = req.user._id;
    await this.reviewCommentsService.deleteComment(reviewId, commentId, userId);
    return { message: '댓글이 삭제되었습니다.', id: commentId };
  }
}
