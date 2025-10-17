import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { Movie, MovieDocument } from '../movies/schemas/movie.schema';
import { MovieVector, MovieVectorDocument } from './schemas/movie-vector.schema';
import { cosineFromWeights } from './utils/text';
import { IngestService } from './ingest.service';
import { JobsService } from './jobs.service';
import { RecoLog, RecoLogDocument } from './schemas/reco-log.schema';
import { UserFeedback, UserFeedbackDocument } from './schemas/user-feedback.schema';
import { FeedbackDto } from './dto/feedback.dto';

type TmdbMovie = {
  id: number;
  title: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  overview?: string;
  popularity?: number;
  vote_average?: number;
  release_date?: string;
  poster_path?: string;
};

@Injectable()
export class RecoService {
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly API_KEY = process.env.TMDB_API_KEY;

  constructor(
    @InjectModel(UserProfile.name)
    private readonly profileModel: Model<UserProfileDocument>,
    @InjectModel(Movie.name)
    private readonly movieModel: Model<MovieDocument>,
    @InjectModel(MovieVector.name)
    private readonly vecModel: Model<MovieVectorDocument>,
    @InjectModel(RecoLog.name)
    private readonly logModel: Model<RecoLogDocument>,
    @InjectModel(UserFeedback.name)
    private readonly feedbackModel: Model<UserFeedbackDocument>,
    private readonly ingest: IngestService,
    private readonly jobs: JobsService,
  ) {}

  async upsertFavoriteGenres(userId: string, favoriteGenres: number[]) {
    const profile = await this.profileModel.findOneAndUpdate(
      { userId },
      { $set: { favoriteGenres } },
      { new: true, upsert: true },
    );
    return profile;
  }

  async addLikes(userId: string, movieIds: number[]) {
    const profile = await this.profileModel.findOneAndUpdate(
      { userId },
      { $addToSet: { likedMovieIds: { $each: movieIds } } },
      { new: true, upsert: true },
    );
    return profile;
  }

  async getCandidates(genreIds: number[], page = 1, size = 20): Promise<{ items: TmdbMovie[]; meta: any }> {
    // Prefer local DB if available; fallback to TMDB discover and trigger background sync
    const query: any = genreIds.length ? { genres: { $in: genreIds } } : {};
    const local = await this.movieModel
      .find(query)
      .sort({ popularity: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();
    if (local?.length) {
      const items = local.map((m) => ({
        id: m.movieId,
        title: m.title,
        genre_ids: m.genres,
        overview: m.overview,
        popularity: m.popularity,
        vote_average: m.voteAverage,
        release_date: m.releaseDate,
        poster_path: m.posterPath,
      }));
      return { items, meta: { source: 'local', partial: false } };
    }
    try {
      const withGenres = genreIds.length ? `&with_genres=${genreIds.join(',')}` : '';
      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=ko-KR&region=KR&page=${page}${withGenres}`;
      const { data } = await axios.get(url);
      const results: TmdbMovie[] = (data.results || []).slice(0, size);

      // Trigger background sync for fetched movies
      const job = this.jobs.create('fallback_discover_sync');
      setTimeout(async () => {
        try {
          this.jobs.setRunning(job.id);
          for (const r of results) {
            // fire and forget per movie
            this.ingest.syncMovieById(r.id).catch(() => void 0);
          }
          this.jobs.complete(job.id);
        } catch (e: any) {
          this.jobs.fail(job.id, e?.message || 'sync failed');
        }
      }, 0);

      return { items: results, meta: { source: 'fallback', partial: true, jobId: job.id, nextRefreshAfter: 5 } };
    } catch (e) {
      throw new HttpException('TMDB discover failed', HttpStatus.BAD_GATEWAY);
    }
  }

  private scoreMovie(
    movie: TmdbMovie,
    favoriteGenres: number[],
    weights = { alpha: Number(process.env.RECO_ALPHA ?? 0.6), beta: Number(process.env.RECO_BETA ?? 0.2), gamma: Number(process.env.RECO_GAMMA ?? 0.15), delta: Number(process.env.RECO_DELTA ?? 0.05) },
  ) {
    const movieGenres = movie.genre_ids || (movie.genres ? movie.genres.map((g) => g.id) : []);
    const matchCount = movieGenres.filter((g) => favoriteGenres.includes(g)).length;
    const sim = favoriteGenres.length ? matchCount / favoriteGenres.length : 0;

    // popularity: 대략 0~100+ 범위 -> 0~1 정규화(간단 min-max 근사)
    const pop = Math.min(1, Math.max(0, (movie.popularity || 0) / 100));
    const vote = Math.min(1, Math.max(0, (movie.vote_average || 0) / 10));
    // recency: 최근일수/연차 감쇠 기반 점수
    let rec = 0;
    const rd = movie.release_date ? new Date(movie.release_date) : null;
    if (rd && !isNaN(rd.getTime())) {
      const ageDays = (Date.now() - rd.getTime()) / (1000 * 60 * 60 * 24);
      const ageYears = ageDays / 365;
      // 0년에 가깝게 1, 오래될수록 0으로 감쇠
      rec = Math.exp(-ageYears / 8); // 8년 반감 정도
    }

    const score = weights.alpha * sim + weights.beta * pop + weights.gamma * vote + weights.delta * rec;
    const reasons: string[] = [];
    if (matchCount > 0) reasons.push(`matchedGenres:${matchCount}`);
    if (movie.popularity) reasons.push(`popularity:${movie.popularity.toFixed(1)}`);
    if (movie.vote_average) reasons.push(`vote:${movie.vote_average.toFixed(1)}`);
    if (rec) reasons.push(`recency:${rec.toFixed(2)}`);
    return { score, reasons };
  }

  async getPersonal(userId: string, size = 20) {
    const profile = await this.profileModel.findOne({ userId });
    const favoriteGenres = profile?.favoriteGenres || [];

    // Candidate pool: local DB by genre; fallback to TMDB
    const [c1, c2] = await Promise.all([
      this.getCandidates(favoriteGenres, 1, size),
      this.getCandidates(favoriteGenres, 2, size),
    ]);
    const poolMap = new Map<number, TmdbMovie>();
    ;[...c1.items, ...c2.items].forEach((m) => poolMap.set(m.id, m));
    const pool = Array.from(poolMap.values());

    // Build user vectors from feedback if available (positive/negative)
    const likedIds = profile?.likedMovieIds || [];
    const dislikedIds = profile?.dislikedMovieIds || [];
    let userVec: { [term: string]: number } | null = null;
    let userNegVec: { [term: string]: number } | null = null;
    if (likedIds.length) {
      const liked = await this.vecModel.find({ movieId: { $in: likedIds } }).lean();
      if (liked.length) {
        const acc = new Map<string, number>();
        for (const mv of liked) {
          for (const tw of mv.tfidf || []) {
            acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
          }
        }
        const factor = 1 / liked.length;
        userVec = {};
        for (const [t, w] of acc.entries()) userVec[t] = w * factor;
      }
    }
    if (dislikedIds.length) {
      const negs = await this.vecModel.find({ movieId: { $in: dislikedIds } }).lean();
      if (negs.length) {
        const acc = new Map<string, number>();
        for (const mv of negs) {
          for (const tw of mv.tfidf || []) acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
        }
        const factor = 1 / negs.length;
        userNegVec = {};
        for (const [t, w] of acc.entries()) userNegVec[t] = w * factor;
      }
    }

    let ranked = pool
      .map((m) => {
        const { score: baseScore, reasons } = this.scoreMovie(m, favoriteGenres);
        let finalScore = baseScore;
        if (userVec) {
          // cosine similarity with movie vector if exists
          // fetch from DB
          // Note: sync call avoided; we simplify by using cached vectors fetched in batch later if needed
        }
        return {
          movieId: m.id,
          title: m.title,
          posterPath: m.poster_path,
          score: finalScore,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, size);

    // If user vector exists, refine with cosine similarity batch
    if (userVec) {
      const poolIds = ranked.map((r) => r.movieId);
      const vecs = await this.vecModel.find({ movieId: { $in: poolIds } }).lean();
      const map = new Map<number, { tfidf: { term: string; weight: number }[] }>();
      for (const v of vecs) map.set(v.movieId, { tfidf: v.tfidf || [] });

      const userWeights = Object.entries(userVec).map(([term, weight]) => ({ term, weight }));
      for (const r of ranked) {
        const mv = map.get(r.movieId);
        if (!mv) continue;
        const cos = cosineFromWeights(userWeights, mv.tfidf);
        let negCos = 0;
        if (userNegVec) {
          const userNegWeights = Object.entries(userNegVec).map(([term, weight]) => ({ term, weight }));
          negCos = cosineFromWeights(userNegWeights, mv.tfidf);
        }
        // Blend cosine with base score; penalize similarity to negatives
        r.score = 0.5 * cos + 0.4 * r.score - 0.3 * negCos;
        r.reasons = [...r.reasons, `cos:${cos.toFixed(3)}`, negCos ? `neg:${negCos.toFixed(3)}` : ''];
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    // Diversity (epsilon-greedy)
    const eps = Number(process.env.RECO_EPSILON ?? 0.05);
    if (eps > 0 && ranked.length > 3) {
      const topK = Math.min(ranked.length, size);
      for (let i = 0; i < topK; i++) {
        if (Math.random() < eps) {
          const j = i + 1 + Math.floor(Math.random() * Math.max(1, topK - i - 1));
          if (ranked[j]) {
            const tmp = ranked[i];
            ranked[i] = ranked[j];
            ranked[j] = tmp;
            ranked[i].reasons = [...(ranked[i].reasons || []), 'explore'];
          }
        }
      }
    }

    // Log exposures
    try {
      const bulk = ranked.map((r, idx) => ({
        insertOne: { document: { userId, movieId: r.movieId, score: r.score, position: idx, interacted: false } },
      }));
      if (bulk.length) await this.logModel.bulkWrite(bulk, { ordered: false });
    } catch {}

    const anyPartial = (c1.meta?.partial || c2.meta?.partial) ? true : false;
    const jobIds = [c1.meta?.jobId, c2.meta?.jobId].filter(Boolean);
    const meta = {
      partial: anyPartial,
      jobIds,
      source: anyPartial ? 'mixed' : 'local',
      nextRefreshAfter: anyPartial ? 5 : undefined,
    };
    return { items: ranked, meta } as any;
  }

  async addFeedback(dto: FeedbackDto) {
    await this.feedbackModel.create({ userId: dto.userId, movieId: dto.movieId, label: dto.label, source: dto.source });
    if (dto.label === 1) {
      await this.profileModel.findOneAndUpdate(
        { userId: dto.userId },
        { $addToSet: { likedMovieIds: dto.movieId } },
        { upsert: true },
      );
    } else {
      await this.profileModel.findOneAndUpdate(
        { userId: dto.userId },
        { $addToSet: { dislikedMovieIds: dto.movieId } },
        { upsert: true },
      );
    }
    return { ok: true };
  }
}
