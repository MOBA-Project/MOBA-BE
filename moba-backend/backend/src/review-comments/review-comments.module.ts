import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewCommentsController } from './review-comments.controller';
import { ReviewCommentsService } from './review-comments.service';
import { ReviewComment, ReviewCommentSchema } from './schemas/review-comment.schema';
import { ReviewsModule } from '../reviews/reviews.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ReviewComment.name, schema: ReviewCommentSchema }]),
    ReviewsModule,
    AuthModule,
  ],
  controllers: [ReviewCommentsController],
  providers: [ReviewCommentsService],
  exports: [ReviewCommentsService],
})
export class ReviewCommentsModule {}
