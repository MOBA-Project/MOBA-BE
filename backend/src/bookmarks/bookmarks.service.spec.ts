import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from './schemas/bookmark.schema';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let model: jest.Mocked<Model<any>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        {
          provide: getModelToken(Bookmark.name),
          useValue: {
            // constructor new Model(data)
            // We'll mock via function returning { save }
            // but in tests, we will replace new with create pattern by spying on constructor alternative
            // For simplicity, we mock as any and intercept with jest.fn()
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
    model = module.get(getModelToken(Bookmark.name));

    // Hack: mock the "new this.bookmarkModel(data)" pattern
    // Replace the constructor behavior by assigning a function to emulate 'new'
    service['bookmarkModel'] = function (this: any, data: any) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    } as any;
    // re-attach static methods to the function (as mongoose model would have)
    Object.assign(service['bookmarkModel'], model);
  });

  it('should create a bookmark', async () => {
    const dto = { movieId: 550, movieTitle: 'Fight Club' } as any;
    const created = await service.createBookmark('user1', dto);
    expect(created.userId).toBe('user1');
    expect(created.movieId).toBe(550);
  });

  it('should map duplicate key error to ConflictException', async () => {
    // make save throw 11000
    const dto = { movieId: 1, movieTitle: 'X' } as any;
    const instance: any = new (service as any)['bookmarkModel']({ userId: 'u', ...dto });
    instance.save.mockRejectedValueOnce({ code: 11000 });
    // temporarily swap constructor to return our instance
    const original = service['bookmarkModel'];
    // @ts-expect-error
    service['bookmarkModel'] = jest.fn().mockReturnValue(instance);
    await expect(service.createBookmark('u', dto)).rejects.toBeInstanceOf(ConflictException);
    service['bookmarkModel'] = original;
  });

  it('should return bookmark status true/false', async () => {
    (model.findOne as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ _id: 'b1' }) });
    let status = await service.getBookmarkStatus('u', 1);
    expect(status.isBookmarked).toBe(true);

    (model.findOne as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve(null) });
    status = await service.getBookmarkStatus('u', 2);
    expect(status.isBookmarked).toBe(false);
  });

  it('should delete bookmark or throw NotFound', async () => {
    (model.findOneAndDelete as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve({ _id: 'b1' }) });
    await expect(service.deleteBookmark('b1', 'u')).resolves.toBeUndefined();

    (model.findOneAndDelete as jest.Mock).mockReturnValueOnce({ exec: () => Promise.resolve(null) });
    await expect(service.deleteBookmark('b2', 'u')).rejects.toBeInstanceOf(NotFoundException);
  });
});


