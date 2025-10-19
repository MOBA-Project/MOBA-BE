import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
  ): Promise<PostDocument> {
    const post = new this.postModel({
      ...createPostDto,
      userId: new Types.ObjectId(userId),
    });
    return post.save();
  }

  async getPosts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'id nickname')
        .exec(),
      this.postModel.countDocuments(),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPostById(postId: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(postId)
      .populate('userId', 'id nickname')
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async getPostsByUser(userId: string, page: number = 1, limit: number = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'id nickname')
        .exec(),
      this.postModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePost(
    postId: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    Object.assign(post, updatePostDto);
    return post.save();
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.findByIdAndDelete(postId);
  }

  async likePost(postId: string, userId: string): Promise<PostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const userObjectId = new Types.ObjectId(userId);

    // 좋아요 취소 시도
    let post = await this.postModel.findOneAndUpdate(
      { _id: postId, likedBy: userObjectId },
      {
        $pull: { likedBy: userObjectId },
        $inc: { likes: -1 },
      },
      { new: true },
    );

    // 좋아요 취소 성공하면 반환
    if (post) {
      return post.populate('userId', 'id nickname');
    }

    // 좋아요 추가 시도
    post = await this.postModel.findOneAndUpdate(
      { _id: postId, likedBy: { $ne: userObjectId } },
      {
        $push: { likedBy: userObjectId },
        $inc: { likes: 1 },
      },
      { new: true },
    );

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post.populate('userId', 'id nickname');
  }

  async incrementCommentCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  }

  async decrementCommentCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
  }
}
