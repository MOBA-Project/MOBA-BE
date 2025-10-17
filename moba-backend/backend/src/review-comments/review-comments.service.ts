import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewComment, ReviewCommentDocument } from './schemas/review-comment.schema';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { UpdateReviewCommentDto } from './dto/update-review-comment.dto';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class ReviewCommentsService {
  constructor(
    @InjectModel(ReviewComment.name)
    private readonly reviewCommentModel: Model<ReviewCommentDocument>,
    private readonly reviewsService: ReviewsService,
  ) {}

  // 댓글 작성
  async createComment(
    reviewId: string,
    userId: Types.ObjectId,
    dto: CreateReviewCommentDto,
  ): Promise<ReviewCommentDocument> {
    // 리뷰 존재 확인
    await this.reviewsService.getReviewById(reviewId);

    let finalParentId: Types.ObjectId | null = null;

    // 부모 댓글이 지정된 경우
    if (dto.parentCommentId) {
      if (!Types.ObjectId.isValid(dto.parentCommentId)) {
        throw new BadRequestException('유효하지 않은 부모 댓글 ID입니다.');
      }

      const parentComment = await this.reviewCommentModel.findById(dto.parentCommentId);
      if (!parentComment) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
      }

      // 부모 댓글이 같은 리뷰에 속하는지 확인
      if (parentComment.reviewId !== reviewId) {
        throw new BadRequestException('부모 댓글이 다른 리뷰에 속해 있습니다.');
      }

      // 대댓글의 대댓글인 경우 -> 루트로 올림
      if (parentComment.parentId) {
        finalParentId = parentComment.parentId;
      } else {
        // 루트 댓글에 대한 답글
        finalParentId = new Types.ObjectId(dto.parentCommentId);
      }
    }

    const comment = await this.reviewCommentModel.create({
      reviewId,
      userId,
      content: dto.content,
      isSpoiler: dto.isSpoiler || false,
      parentId: finalParentId,
    });

    return comment;
  }

  // 댓글 목록 조회 (페이지네이션, 정렬)
  async getCommentsByReview(
    reviewId: string,
    parentId?: string,
    page = 1,
    limit = 10,
    sort: 'recent' | 'likes' = 'recent',
  ): Promise<{
    items: ReviewCommentDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    // 리뷰 존재 확인
    await this.reviewsService.getReviewById(reviewId);

    // 페이지네이션 검증
    if (page < 1) throw new BadRequestException('페이지 번호는 1 이상이어야 합니다.');
    if (limit < 1 || limit > 50) throw new BadRequestException('limit은 1~50 사이여야 합니다.');

    const skip = (page - 1) * limit;

    // 필터 조건
    const filter: any = { reviewId };

    if (parentId) {
      // 특정 루트 댓글의 답글 목록
      if (!Types.ObjectId.isValid(parentId)) {
        throw new BadRequestException('유효하지 않은 부모 댓글 ID입니다.');
      }
      filter.parentId = new Types.ObjectId(parentId);
    } else {
      // 루트 댓글 목록 (parentId가 null)
      filter.parentId = null;
    }

    // 정렬 조건
    const sortOption: any = sort === 'likes' ? { likes: -1, createdAt: -1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.reviewCommentModel.find(filter).sort(sortOption).skip(skip).limit(limit).exec(),
      this.reviewCommentModel.countDocuments(filter),
    ]);

    return { items, page, limit, total };
  }

  // 댓글 상세 조회
  async getCommentById(commentId: string): Promise<ReviewCommentDocument> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  // 댓글 수정
  async updateComment(
    reviewId: string,
    commentId: string,
    userId: Types.ObjectId,
    dto: UpdateReviewCommentDto,
  ): Promise<ReviewCommentDocument> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 같은 리뷰에 속하는지 확인
    if (comment.reviewId !== reviewId) {
      throw new BadRequestException('댓글이 해당 리뷰에 속하지 않습니다.');
    }

    // 본인이 작성한 댓글인지 확인
    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('본인이 작성한 댓글만 수정할 수 있습니다.');
    }

    // 업데이트할 필드만 수정
    if (dto.content !== undefined) comment.content = dto.content;
    if (dto.isSpoiler !== undefined) comment.isSpoiler = dto.isSpoiler;

    await comment.save();
    return comment;
  }

  // 댓글 삭제
  async deleteComment(reviewId: string, commentId: string, userId: Types.ObjectId): Promise<void> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 같은 리뷰에 속하는지 확인
    if (comment.reviewId !== reviewId) {
      throw new BadRequestException('댓글이 해당 리뷰에 속하지 않습니다.');
    }

    // 본인이 작성한 댓글인지 확인
    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('본인이 작성한 댓글만 삭제할 수 있습니다.');
    }

    // 루트 댓글인 경우 -> 해당 루트와 모든 답글 삭제
    if (!comment.parentId) {
      await this.reviewCommentModel.deleteMany({ parentId: comment._id });
    }

    // 댓글 삭제
    await this.reviewCommentModel.findByIdAndDelete(commentId);
  }

  // 답글 개수 조회
  async getRepliesCount(commentId: Types.ObjectId): Promise<number> {
    return this.reviewCommentModel.countDocuments({ parentId: commentId });
  }

  // 좋아요 토글 (리뷰 service와 동일한 패턴)
  async likeComment(
    reviewId: string,
    commentId: string,
    userId: Types.ObjectId,
  ): Promise<ReviewCommentDocument> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    // 1차 시도: 이미 좋아요를 누른 경우 - 좋아요 취소
    let updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      { _id: commentId, reviewId, likesBy: userId },
      {
        $pull: { likesBy: userId },
        $inc: { likes: -1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 2차 시도: 싫어요를 누른 상태에서 좋아요 - 싫어요 제거하고 좋아요 추가
    updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      { _id: commentId, reviewId, dislikesBy: userId },
      {
        $pull: { dislikesBy: userId },
        $addToSet: { likesBy: userId },
        $inc: { dislikes: -1, likes: 1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 3차 시도: 처음 좋아요 누르는 경우
    updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      {
        _id: commentId,
        reviewId,
        likesBy: { $ne: userId },
        dislikesBy: { $ne: userId },
      },
      {
        $addToSet: { likesBy: userId },
        $inc: { likes: 1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 모든 시도 실패
    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 이미 처리된 경우 현재 상태 반환 (멱등성 보장)
    return comment;
  }

  // 싫어요 토글
  async dislikeComment(
    reviewId: string,
    commentId: string,
    userId: Types.ObjectId,
  ): Promise<ReviewCommentDocument> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    // 1차 시도: 이미 싫어요를 누른 경우 - 싫어요 취소
    let updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      { _id: commentId, reviewId, dislikesBy: userId },
      {
        $pull: { dislikesBy: userId },
        $inc: { dislikes: -1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 2차 시도: 좋아요를 누른 상태에서 싫어요 - 좋아요 제거하고 싫어요 추가
    updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      { _id: commentId, reviewId, likesBy: userId },
      {
        $pull: { likesBy: userId },
        $addToSet: { dislikesBy: userId },
        $inc: { likes: -1, dislikes: 1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 3차 시도: 처음 싫어요 누르는 경우
    updatedComment = await this.reviewCommentModel.findOneAndUpdate(
      {
        _id: commentId,
        reviewId,
        likesBy: { $ne: userId },
        dislikesBy: { $ne: userId },
      },
      {
        $addToSet: { dislikesBy: userId },
        $inc: { dislikes: 1 },
      },
      { new: true },
    );
    if (updatedComment) return updatedComment;

    // 모든 시도 실패
    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    // 이미 처리된 경우 현재 상태 반환 (멱등성 보장)
    return comment;
  }

  // 리액션 상태 조회
  async getReactionStatus(
    reviewId: string,
    commentId: string,
    userId: Types.ObjectId,
  ): Promise<{ liked: boolean; disliked: boolean }> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('유효하지 않은 댓글 ID입니다.');
    }

    const comment = await this.reviewCommentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.reviewId !== reviewId) {
      throw new BadRequestException('댓글이 해당 리뷰에 속하지 않습니다.');
    }

    const userIdStr = userId.toString();
    const liked = comment.likesBy.some((id) => id.toString() === userIdStr);
    const disliked = comment.dislikesBy.some((id) => id.toString() === userIdStr);

    return { liked, disliked };
  }
}
