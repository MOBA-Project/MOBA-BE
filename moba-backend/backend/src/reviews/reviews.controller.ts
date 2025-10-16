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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 작성', description: '영화에 대한 리뷰를 작성합니다. (로그인 필요)' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  async createReview(@Req() req, @Body() dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const userId = req.user._id;
    const review = await this.reviewsService.createReview(userId, dto);

    return {
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    };
  }

  @Get('movie/:movieId/stats')
  @ApiOperation({ summary: '영화 평점 통계', description: '영화의 평균 평점과 총 리뷰 수를 조회합니다.' })
  @ApiParam({ name: 'movieId', example: 550, description: 'TMDB 영화 ID' })
  @ApiResponse({ status: 200, description: '평균 평점과 총 리뷰 수' })
  async getMovieStats(@Param('movieId', ParseIntPipe) movieId: number) {
    return this.reviewsService.getAverageRating(movieId);
  }

  @Get('movie/:movieId')
  @ApiOperation({ summary: '영화별 리뷰 목록 조회', description: '특정 영화의 리뷰 목록을 조회합니다.' })
  @ApiParam({ name: 'movieId', example: 550, description: 'TMDB 영화 ID' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: '페이지 번호 (기본값 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: '페이지당 개수 (기본값 10)' })
  @ApiResponse({ status: 200, description: '리뷰 목록 조회 성공' })
  async getReviewsByMovie(
    @Param('movieId', ParseIntPipe) movieId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getReviewsByMovie(movieId, page, limit);
  }

  @Get('user/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 리뷰 목록 조회', description: '로그인한 사용자의 리뷰 목록을 조회합니다.' })
  @ApiResponse({ status: 200, type: [ReviewResponseDto] })
  async getMyReviews(@Req() req): Promise<ReviewResponseDto[]> {
    const userId = req.user._id;
    const reviews = await this.reviewsService.getReviewsByUser(userId);

    return reviews.map((review) => ({
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    }));
  }

  @Get(':reviewId')
  @ApiOperation({ summary: '리뷰 상세 조회', description: '특정 리뷰의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async getReviewById(@Param('reviewId') reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.getReviewById(reviewId);

    return {
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    };
  }

  @Put(':reviewId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 수정', description: '본인이 작성한 리뷰를 수정합니다. (로그인 필요)' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Req() req,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const userId = req.user._id;
    const review = await this.reviewsService.updateReview(reviewId, userId, dto);

    return {
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    };
  }

  @Delete(':reviewId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 삭제', description: '본인이 작성한 리뷰를 삭제합니다. (로그인 필요)' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 200, description: '리뷰 삭제 성공' })
  async deleteReview(@Param('reviewId') reviewId: string, @Req() req) {
    const userId = req.user._id;
    await this.reviewsService.deleteReview(reviewId, userId);
    return { message: '리뷰가 삭제되었습니다.' };
  }

  @Post(':reviewId/like')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 좋아요', description: '리뷰에 좋아요를 누릅니다. 이미 누른 경우 취소됩니다. (로그인 필요)' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async likeReview(@Param('reviewId') reviewId: string, @Req() req): Promise<ReviewResponseDto> {
    const userId = req.user._id;
    const review = await this.reviewsService.likeReview(reviewId, userId);

    return {
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    };
  }

  @Post(':reviewId/dislike')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 싫어요', description: '리뷰에 싫어요를 누릅니다. 이미 누른 경우 취소됩니다. (로그인 필요)' })
  @ApiParam({ name: 'reviewId', description: '리뷰 ID' })
  @ApiResponse({ status: 200, type: ReviewResponseDto })
  async dislikeReview(@Param('reviewId') reviewId: string, @Req() req): Promise<ReviewResponseDto> {
    const userId = req.user._id;
    const review = await this.reviewsService.dislikeReview(reviewId, userId);

    return {
      _id: review._id?.toString() ?? '',
      userId: review.userId.toString(),
      movieId: review.movieId,
      rating: review.rating,
      content: review.content,
      likes: review.likes,
      dislikes: review.dislikes,
      tags: review.tags,
      isSpoiler: review.isSpoiler,
      createdAt: review.createdAt ?? new Date(),
      updatedAt: review.updatedAt ?? new Date(),
    };
  }
}
