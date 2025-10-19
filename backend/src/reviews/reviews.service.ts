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
    // 페이지네이션 파라미터 검증
    if (page < 1) {
      throw new BadRequestException('페이지 번호는 1 이상이어야 합니다.');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('페이지당 개수는 1~100 사이여야 합니다.');
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ movieId })
        .populate('userId', 'nickname')
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
    return this.reviewModel.find({ userId }).populate('userId', 'nickname').sort({ createdAt: -1 }).exec();
  }

  // 리뷰 상세 조회
  async getReviewById(reviewId: string): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId).populate('userId', 'nickname');
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

  // 리뷰 좋아요 (동시성 안전, 토글 방식)
  async likeReview(reviewId: string, userId: Types.ObjectId): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    // 1차 시도: 이미 좋아요를 누른 경우 - 좋아요 취소
    let updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, likedBy: userId },
      {
        $pull: { likedBy: userId },
        $inc: { likes: -1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 2차 시도: 싫어요를 누른 상태에서 좋아요 - 싫어요 제거하고 좋아요 추가
    updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, dislikedBy: userId },
      {
        $pull: { dislikedBy: userId },
        $addToSet: { likedBy: userId },
        $inc: { dislikes: -1, likes: 1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 3차 시도: 처음 좋아요 누르는 경우 (좋아요도 싫어요도 안 누른 상태)
    updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, likedBy: { $ne: userId }, dislikedBy: { $ne: userId } },
      {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 모든 시도 실패 = 리뷰가 존재하지 않거나 동시 요청으로 인해 상태가 변경됨
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    // 이미 처리된 경우 현재 상태 반환 (멱등성 보장)
    return review;
  }

  // 리뷰 싫어요 (동시성 안전, 토글 방식)
  async dislikeReview(reviewId: string, userId: Types.ObjectId): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    // 1차 시도: 이미 싫어요를 누른 경우 - 싫어요 취소
    let updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, dislikedBy: userId },
      {
        $pull: { dislikedBy: userId },
        $inc: { dislikes: -1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 2차 시도: 좋아요를 누른 상태에서 싫어요 - 좋아요 제거하고 싫어요 추가
    updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, likedBy: userId },
      {
        $pull: { likedBy: userId },
        $addToSet: { dislikedBy: userId },
        $inc: { likes: -1, dislikes: 1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 3차 시도: 처음 싫어요 누르는 경우 (좋아요도 싫어요도 안 누른 상태)
    updatedReview = await this.reviewModel.findOneAndUpdate(
      { _id: reviewId, likedBy: { $ne: userId }, dislikedBy: { $ne: userId } },
      {
        $addToSet: { dislikedBy: userId },
        $inc: { dislikes: 1 },
      },
      { new: true },
    );
    if (updatedReview) return updatedReview;

    // 모든 시도 실패 = 리뷰가 존재하지 않거나 동시 요청으로 인해 상태가 변경됨
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    // 이미 처리된 경우 현재 상태 반환 (멱등성 보장)
    return review;
  }

  // 영화의 평균 평점 계산 (MongoDB Aggregation 사용 - 최적화)
  async getAverageRating(movieId: number): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await this.reviewModel.aggregate([
      { $match: { movieId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // 소수점 첫째자리까지
      totalReviews: result[0].totalReviews,
    };
  }

  // 리뷰에 대한 현재 사용자의 좋아요/싫어요 상태 조회
  async getReactionStatus(
    reviewId: string,
    userId: Types.ObjectId,
  ): Promise<{ isLiked: boolean; isDisliked: boolean }> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('유효하지 않은 리뷰 ID입니다.');
    }

    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    const userIdStr = userId.toString();
    const isLiked = review.likedBy.some(id => id.toString() === userIdStr);
    const isDisliked = review.dislikedBy.some(id => id.toString() === userIdStr);

    return { isLiked, isDisliked };
  }
}
