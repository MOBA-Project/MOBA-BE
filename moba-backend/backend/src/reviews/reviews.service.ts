import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  // 리뷰 작성
  async createReview(userId: Types.ObjectId, dto: CreateReviewDto): Promise<ReviewDocument> {
    // 이미 해당 영화에 리뷰를 작성했는지 확인
    const existingReview = await this.reviewModel.findOne({
      userId,
      movieId: dto.movieId,
    });

    if (existingReview) {
      throw new ConflictException('이미 해당 영화에 리뷰를 작성하셨습니다.');
    }

    const review = await this.reviewModel.create({
      userId,
      movieId: dto.movieId,
      rating: dto.rating,
      content: dto.content,
      tags: dto.tags || [],
      isSpoiler: dto.isSpoiler || false,
    });

    return review;
  }

  // 특정 영화의 리뷰 목록 조회 (페이지네이션)
  async getReviewsByMovie(
    movieId: number,
    page = 1,
    limit = 10,
  ): Promise<{ reviews: ReviewDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ movieId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ movieId }),
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 특정 유저의 리뷰 목록 조회
  async getReviewsByUser(userId: Types.ObjectId): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  // 리뷰 상세 조회
  async getReviewById(reviewId: string): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    return review;
  }

  // 리뷰 수정
  async updateReview(
    reviewId: string,
    userId: Types.ObjectId,
    dto: UpdateReviewDto,
  ): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    // 본인이 작성한 리뷰인지 확인
    if (review.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('본인이 작성한 리뷰만 수정할 수 있습니다.');
    }

    // 업데이트할 필드만 수정
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.content !== undefined) review.content = dto.content;
    if (dto.tags !== undefined) review.tags = dto.tags;
    if (dto.isSpoiler !== undefined) review.isSpoiler = dto.isSpoiler;

    await review.save();
    return review;
  }

  // 리뷰 삭제
  async deleteReview(reviewId: string, userId: Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    // 본인이 작성한 리뷰인지 확인
    if (review.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('본인이 작성한 리뷰만 삭제할 수 있습니다.');
    }

    await this.reviewModel.findByIdAndDelete(reviewId);
  }

  // 리뷰 좋아요
  async likeReview(reviewId: string): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    review.likes += 1;
    await review.save();
    return review;
  }

  // 리뷰 싫어요
  async dislikeReview(reviewId: string): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    review.dislikes += 1;
    await review.save();
    return review;
  }

  // 영화의 평균 평점 계산
  async getAverageRating(movieId: number): Promise<{ averageRating: number; totalReviews: number }> {
    const reviews = await this.reviewModel.find({ movieId });
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = Math.round((sum / totalReviews) * 10) / 10; // 소수점 첫째자리까지

    return { averageRating, totalReviews };
  }
}
