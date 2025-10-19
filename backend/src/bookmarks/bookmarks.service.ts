import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bookmark, BookmarkDocument } from './schemas/bookmark.schema';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectModel(Bookmark.name) private bookmarkModel: Model<BookmarkDocument>,
  ) {}

  // 북마크 생성 (토글 방식)
  async createBookmark(userId: string, createBookmarkDto: CreateBookmarkDto): Promise<{ bookmark?: Bookmark; deleted: boolean; message: string }> {
    console.log('🔍 [Service] createBookmark called - userId:', userId, 'movieId:', createBookmarkDto.movieId);

    // 이미 북마크가 있는지 확인
    const existingBookmark = await this.bookmarkModel.findOne({
      userId,
      movieId: createBookmarkDto.movieId,
    }).exec();

    console.log('🔍 [Service] existingBookmark:', existingBookmark);

    // 이미 있으면 삭제 (토글)
    if (existingBookmark) {
      await this.bookmarkModel.findByIdAndDelete(existingBookmark._id).exec();
      console.log('✅ [Service] Bookmark DELETED - movieId:', createBookmarkDto.movieId);
      return {
        deleted: true,
        message: '북마크가 삭제되었습니다.',
      };
    }

    // 없으면 생성
    const bookmark = new this.bookmarkModel({
      userId,
      ...createBookmarkDto,
    });
    const saved = await bookmark.save();
    console.log('✅ [Service] Bookmark CREATED - id:', saved._id, 'movieId:', createBookmarkDto.movieId);

    return {
      bookmark: saved,
      deleted: false,
      message: '북마크가 추가되었습니다.',
    };
  }

  // 사용자의 모든 북마크 조회
  async getUserBookmarks(userId: string, page: number = 1, limit: number = 10): Promise<{ bookmarks: Bookmark[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [bookmarks, total] = await Promise.all([
      this.bookmarkModel
        .find({ userId })
        .sort({ bookmarkedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookmarkModel.countDocuments({ userId })
    ]);

    return { bookmarks, total };
  }

  // 특정 북마크 조회
  async getBookmarkById(bookmarkId: string, userId: string): Promise<Bookmark> {
    const bookmark = await this.bookmarkModel.findOne({ _id: bookmarkId, userId }).exec();
    if (!bookmark) {
      throw new NotFoundException('북마크를 찾을 수 없습니다.');
    }
    return bookmark;
  }

  // 북마크 수정
  async updateBookmark(bookmarkId: string, userId: string, updateBookmarkDto: UpdateBookmarkDto): Promise<Bookmark> {
    const bookmark = await this.bookmarkModel.findOneAndUpdate(
      { _id: bookmarkId, userId },
      updateBookmarkDto,
      { new: true }
    ).exec();

    if (!bookmark) {
      throw new NotFoundException('북마크를 찾을 수 없습니다.');
    }
    return bookmark;
  }

  // 북마크 삭제
  async deleteBookmark(bookmarkId: string, userId: string): Promise<void> {
    const result = await this.bookmarkModel.findOneAndDelete({ _id: bookmarkId, userId }).exec();
    if (!result) {
      throw new NotFoundException('북마크를 찾을 수 없습니다.');
    }
  }

  // 특정 영화의 북마크 상태 확인
  async getBookmarkStatus(userId: string, movieId: number): Promise<{ isBookmarked: boolean, bookmark?: Bookmark }> {
    const bookmark = await this.bookmarkModel.findOne({ userId, movieId }).exec();
    console.log('🔍 [Service] getBookmarkStatus - userId:', userId, 'movieId:', movieId, 'found:', !!bookmark);
    return {
      isBookmarked: !!bookmark,
      bookmark: bookmark || undefined
    };
  }

  // 시청완료한 북마크 조회
  async getWatchedBookmarks(userId: string, page: number = 1, limit: number = 10): Promise<{ bookmarks: Bookmark[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [bookmarks, total] = await Promise.all([
      this.bookmarkModel
        .find({ userId, isWatched: true })
        .sort({ bookmarkedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookmarkModel.countDocuments({ userId, isWatched: true })
    ]);

    return { bookmarks, total };
  }

  // 사용자 태그 목록 조회
  async getUserTags(userId: string): Promise<string[]> {
    const result = await this.bookmarkModel.aggregate([
      { $match: { userId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags' } },
      { $sort: { _id: 1 } }
    ]).exec();
    
    return result.map(item => item._id);
  }

  // 여러 영화의 북마크 상태를 한 번의 쿼리로 조회
  async getBookmarksStatusBulk(
    userId: string,
    movieIds: number[],
  ): Promise<{ movieId: number; isBookmarked: boolean }[]> {
    if (!Array.isArray(movieIds) || movieIds.length === 0) return [];
    const rows = await this.bookmarkModel
      .find({ userId, movieId: { $in: movieIds } }, { movieId: 1 })
      .lean();
    const have = new Set<number>((rows || []).map((r: any) => r.movieId));
    return movieIds.map((id) => ({ movieId: id, isBookmarked: have.has(id) }));
  }
}
