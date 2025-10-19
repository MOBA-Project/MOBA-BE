import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private postsService: PostsService,
  ) {}

  async createComment(
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentDocument> {
    const { postId, parentCommentId } = createCommentDto;

    // 게시물 존재 확인
    await this.postsService.getPostById(postId);

    // 부모 댓글 존재 확인 (대댓글인 경우)
    if (parentCommentId) {
      const parentComment = await this.commentModel.findById(parentCommentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      // 대댓글의 대댓글은 허용하지 않음
      if (parentComment.parentCommentId) {
        throw new BadRequestException('Cannot reply to a reply');
      }
    }

    const comment = new this.commentModel({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      content: createCommentDto.content,
      parentCommentId: parentCommentId
        ? new Types.ObjectId(parentCommentId)
        : null,
    });

    const savedComment = await comment.save();

    // 게시물의 댓글 수 증가 (최상위 댓글만)
    if (!parentCommentId) {
      await this.postsService.incrementCommentCount(postId);
    }

    return savedComment;
  }

  async getCommentsByPost(postId: string): Promise<CommentDocument[]> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    // 게시물 존재 확인
    await this.postsService.getPostById(postId);

    // 최상위 댓글만 가져오기 (대댓글 제외)
    const comments = await this.commentModel
      .find({
        postId: new Types.ObjectId(postId),
        parentCommentId: null,
      })
      .sort({ createdAt: 1 })
      .populate('userId', 'id nickname')
      .exec();

    // 각 댓글의 대댓글 가져오기
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await this.commentModel
          .find({ parentCommentId: comment._id })
          .sort({ createdAt: 1 })
          .populate('userId', 'id nickname')
          .exec();

        return {
          ...comment.toObject(),
          replies,
        };
      }),
    );

    return commentsWithReplies as any;
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentDocument> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    comment.content = updateCommentDto.content;
    return comment.save();
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // 대댓글도 함께 삭제
    if (!comment.parentCommentId) {
      await this.commentModel.deleteMany({ parentCommentId: comment._id });
      // 게시물의 댓글 수 감소
      await this.postsService.decrementCommentCount(
        comment.postId.toString(),
      );
    }

    await this.commentModel.findByIdAndDelete(commentId);
  }
}
