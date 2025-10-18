import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { Movie, MovieDocument } from '../movies/schemas/movie.schema';
import { MovieVector, MovieVectorDocument } from './schemas/movie-vector.schema';
import { cosineFromWeights, cosineVec } from './utils/text';
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

  // Preview personalized recommendations from transient inputs without persisting
  async previewRecommendations(args: { favoriteGenres: number[]; likes: number[]; dislikes: number[]; size: number }) {
    const favoriteGenres = args.favoriteGenres || [];
    const size = Math.max(1, Math.min(50, args.size || 20));

    // Candidate pool with simple expansion across pages and filtering
    const excludeIds = new Set<number>([...new Set([...(args.likes || []), ...(args.dislikes || [])])]);
    const poolMap = new Map<number, TmdbMovie>();
    let page = 1;
    const maxPages = 5;
    while (poolMap.size < size * 2 && page <= maxPages) {
      const cand = await this.getCandidates(favoriteGenres, page, size);
      for (const m of cand.items) {
        if (!excludeIds.has(m.id)) poolMap.set(m.id, m);
      }
      page++;
      // If source was fallback/partial, still attempt a couple of pages for variety
    }
    const pool = Array.from(poolMap.values());

    // Build transient user vectors from provided likes/dislikes
    const likedIds = Array.from(new Set(args.likes || []));
    const dislikedIds = Array.from(new Set(args.dislikes || []));
    let userVec: { [term: string]: number } | null = null;
    let userNegVec: { [term: string]: number } | null = null;
    let userSbert: number[] | null = null;
    let userNegSbert: number[] | null = null;

    if (likedIds.length) {
      const liked = await this.vecModel.find({ movieId: { $in: likedIds } }).lean();
      if (liked.length) {
        const acc = new Map<string, number>();
        let countEmb = 0;
        let dim = 0;
        for (const mv of liked) {
          for (const tw of mv.tfidf || []) acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
          if (mv.sbert && mv.sbert.length) {
            if (!userSbert) {
              userSbert = Array(mv.sbert.length).fill(0);
              dim = mv.sbert.length;
            }
            for (let i = 0; i < mv.sbert.length; i++) userSbert[i] += mv.sbert[i] || 0;
            countEmb++;
          }
        }
        const factor = 1 / liked.length;
        userVec = {};
        for (const [t, w] of acc.entries()) userVec[t] = w * factor;
        if (userSbert && countEmb > 0 && dim > 0) {
          for (let i = 0; i < dim; i++) userSbert[i] = userSbert[i] / countEmb;
        }
      }
    }

    if (dislikedIds.length) {
      const negs = await this.vecModel.find({ movieId: { $in: dislikedIds } }).lean();
      if (negs.length) {
        const acc = new Map<string, number>();
        let countEmb = 0;
        let dim = 0;
        for (const mv of negs) {
          for (const tw of mv.tfidf || []) acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
          if (mv.sbert && mv.sbert.length) {
            if (!userNegSbert) {
              userNegSbert = Array(mv.sbert.length).fill(0);
              dim = mv.sbert.length;
            }
            for (let i = 0; i < mv.sbert.length; i++) userNegSbert[i] += mv.sbert[i] || 0;
            countEmb++;
          }
        }
        const factor = 1 / negs.length;
        userNegVec = {};
        for (const [t, w] of acc.entries()) userNegVec[t] = w * factor;
        if (userNegSbert && countEmb > 0 && dim > 0) {
          for (let i = 0; i < dim; i++) userNegSbert[i] = userNegSbert[i] / countEmb;
        }
      }
    }

    // Base ranking
    let ranked = pool
      .map((m) => {
        const { score: baseScore, reasons } = this.scoreMovie(m, favoriteGenres);
        return {
          movieId: m.id,
          title: m.title,
          posterPath: m.poster_path,
          score: baseScore,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, size);

    // TF-IDF refine if available (apply negative even without positives)
    if (userVec || userNegVec) {
      const poolIds = ranked.map((r) => r.movieId);
      const vecs = await this.vecModel.find({ movieId: { $in: poolIds } }).lean();
      const map = new Map<number, { tfidf: { term: string; weight: number }[] }>();
      for (const v of vecs) map.set(v.movieId, { tfidf: v.tfidf || [] });
      const userWeights = userVec ? Object.entries(userVec).map(([term, weight]) => ({ term, weight })) : [];
      for (const r of ranked) {
        const mv = map.get(r.movieId);
        if (!mv) continue;
        const cos = userVec ? cosineFromWeights(userWeights, mv.tfidf) : 0;
        let negCos = 0;
        if (userNegVec) {
          const userNegWeights = Object.entries(userNegVec).map(([term, weight]) => ({ term, weight }));
          negCos = cosineFromWeights(userNegWeights, mv.tfidf);
        }
        const wT = Number(process.env.BLEND_TFIDF ?? 0.2);
        const wB = Number(process.env.BLEND_BASE ?? 0.3);
        const wTN = Number(process.env.BLEND_TFIDF_NEG ?? 0.6);
        r.score = wB * r.score + wT * cos - wTN * negCos;
        r.reasons = [...r.reasons, `tfidf:${cos.toFixed(3)}`, userNegVec ? `neg:${negCos.toFixed(3)}` : ''];
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    // SBERT refine if available and enabled
    if (userSbert) {
      const poolIds = ranked.map((r) => r.movieId);
      const vecs = await this.vecModel.find({ movieId: { $in: poolIds } }, { movieId: 1, sbert: 1 }).lean();
      const mapS = new Map<number, number[]>();
      for (const v of vecs) mapS.set(v.movieId, (v as any).sbert || []);
      const wS = Number(process.env.BLEND_SBERT ?? 0.5);
      for (const r of ranked) {
        const mvS = mapS.get(r.movieId);
        if (!mvS?.length) continue;
        const cosS = cosineVec(userSbert, mvS);
        let negS = 0;
        if (userNegSbert?.length) negS = cosineVec(userNegSbert, mvS);
        r.score = r.score + wS * cosS - 0.2 * negS;
        r.reasons = [...r.reasons, `sbert:${cosS.toFixed(3)}`, negS ? `sneg:${negS.toFixed(3)}` : ''];
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    const meta = { partial: false, source: 'local' } as any;
    return { items: ranked, meta } as any;
  }

  async commitPreferences(dto: { userId: string; favoriteGenres?: number[]; likes?: number[]; dislikes?: number[] }) {
    const userId = dto.userId;
    const fav = dto.favoriteGenres || [];
    const likes = Array.from(new Set(dto.likes || []));
    const dislikes = Array.from(new Set(dto.dislikes || []));

    // Upsert profile with batch updates
    if (fav.length) await this.upsertFavoriteGenres(userId, fav);
    if (likes.length) await this.profileModel.findOneAndUpdate(
      { userId },
      { $addToSet: { likedMovieIds: { $each: likes } } },
      { upsert: true },
    );
    if (dislikes.length) await this.profileModel.findOneAndUpdate(
      { userId },
      { $addToSet: { dislikedMovieIds: { $each: dislikes } } },
      { upsert: true },
    );

    // Fire-and-forget: ensure vectors exist for liked/disliked movies (limited)
    const ensureIds = Array.from(new Set([...likes, ...dislikes])).slice(0, 50);
    if (ensureIds.length) {
      setTimeout(async () => {
        const chunks: number[][] = [];
        const batch = 5; // limit concurrent inflight operations
        for (let i = 0; i < ensureIds.length; i += batch) chunks.push(ensureIds.slice(i, i + batch));
        for (const group of chunks) {
          await Promise.allSettled(group.map((id) => this.ingest.syncMovieById(id)));
        }
      }, 0);
    }

    return { ok: true, userId };
  }


  async getCandidates(genreIds: number[], page = 1, size = 20): Promise<{ items: TmdbMovie[]; meta: any }> {
    // Prefer local DB if available; fallback to TMDB discover and trigger background sync
    const query: any = genreIds.length ? { genres: { $in: genreIds } } : {};

    // 랜덤 샘플링 모드 (환경변수 기반)
    const randomFlag = (process.env.CANDIDATE_RANDOM || '').toLowerCase();
    const useRandom = randomFlag === '1' || randomFlag === 'true';
    const minPop = Number(process.env.CANDIDATE_MIN_POP || 0);
    const maxAgeYears = Number(process.env.CANDIDATE_MAX_AGE_YEARS || 0); // 0이면 제한 없음

    if (useRandom && page === 1) {
      // 로컬에서 조건부 랜덤 샘플링 ($sample)
      const match: any = { ...query };
      if (Number.isFinite(minPop) && minPop > 0) match.popularity = { $gte: minPop };
      try {
        const sampleSize = Math.max(size * 3, size);
        const agg = await this.movieModel
          .aggregate([
            { $match: match },
            { $sample: { size: sampleSize } },
            {
              $project: {
                movieId: 1,
                title: 1,
                genres: 1,
                overview: 1,
                popularity: 1,
                voteAverage: 1,
                releaseDate: 1,
                posterPath: 1,
              },
            },
          ])
          .exec();

        // 연식 필터(옵션)
        const now = Date.now();
        const filtered = (agg || []).filter((m: any) => {
          if (!maxAgeYears || !m?.releaseDate) return true;
          const rd = new Date(m.releaseDate);
          if (isNaN(rd.getTime())) return true;
          const ageYears = (now - rd.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return ageYears <= maxAgeYears;
        });

        const chosen = filtered.slice(0, size);
        if (chosen.length) {
          const items = chosen.map((m: any) => ({
            id: m.movieId,
            title: m.title,
            genre_ids: m.genres,
            overview: m.overview,
            popularity: m.popularity,
            vote_average: m.voteAverage,
            release_date: m.releaseDate,
            poster_path: m.posterPath,
          }));
          return { items, meta: { source: 'local', partial: false, random: true } };
        }
        // 샘플이 비었으면 기존 로직으로 폴백
      } catch {
        // 집계 실패 시 기존 로직으로 폴백
      }
    }

    const local = await this.movieModel
      .find(query)
      .sort({ popularity: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();
    if (local?.length) {
      let rows = local;
      if (useRandom && page === 1) {
        // 간단 셔플 + 연식 필터(옵션)
        const now = Date.now();
        rows = rows.filter((m: any) => {
          if (!maxAgeYears || !m?.releaseDate) return true;
          const rd = new Date(m.releaseDate);
          if (isNaN(rd.getTime())) return true;
          const ageYears = (now - rd.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return ageYears <= maxAgeYears;
        });
        // Fisher-Yates shuffle
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = rows[i];
          rows[i] = rows[j];
          rows[j] = tmp;
        }
        rows = rows.slice(0, size);
      }
      const items = rows.map((m: any) => ({
        id: (m as any).movieId,
        title: (m as any).title,
        genre_ids: (m as any).genres,
        overview: (m as any).overview,
        popularity: (m as any).popularity,
        vote_average: (m as any).voteAverage,
        release_date: (m as any).releaseDate,
        poster_path: (m as any).posterPath,
      }));
      return { items, meta: { source: 'local', partial: false, random: !!(useRandom && page === 1) } };
    }
    try {
      const withGenres = genreIds.length ? `&with_genres=${genreIds.join(',')}` : '';
      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=ko-KR&region=KR&page=${page}${withGenres}`;
      const { data } = await axios.get(url);
      let results: TmdbMovie[] = (data.results || []).slice(0, size);
      if (useRandom && page === 1) {
        // 간단 셔플 + 연식/인기 필터(옵션)
        const now = Date.now();
        const tmp = (data.results || []).filter((r: any) => {
          const okPop = !minPop || (r?.popularity || 0) >= minPop;
          if (!maxAgeYears) return okPop;
          const rd = r?.release_date ? new Date(r.release_date) : null;
          if (!rd || isNaN(rd.getTime())) return okPop;
          const ageYears = (now - rd.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return okPop && ageYears <= maxAgeYears;
        });
        for (let i = tmp.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = tmp[i];
          tmp[i] = tmp[j];
          tmp[j] = t;
        }
        results = tmp.slice(0, size);
      }

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

    // Build exclusion set: liked, disliked, and recently exposed items
    const excludeIds = new Set<number>([...new Set([...(profile?.likedMovieIds || []), ...(profile?.dislikedMovieIds || [])])]);
    try {
      const recent = await this.logModel
        .find({ userId }, { movieId: 1 })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      for (const r of recent) excludeIds.add((r as any).movieId);
    } catch {}

    // Candidate pool with expansion across pages until we have enough after filtering
    const poolMap = new Map<number, TmdbMovie>();
    let page = 1;
    const maxPages = 8;
    while (poolMap.size < Math.max(size * 2, 40) && page <= maxPages) {
      const cand = await this.getCandidates(favoriteGenres, page, Math.max(size, 20));
      for (const m of cand.items) {
        if (!excludeIds.has(m.id)) poolMap.set(m.id, m);
      }
      page++;
    }
    const pool = Array.from(poolMap.values());

    // Build user vectors from feedback if available (positive/negative)
    const likedIds = profile?.likedMovieIds || [];
    const dislikedIds = profile?.dislikedMovieIds || [];
    let userVec: { [term: string]: number } | null = null;
    let userNegVec: { [term: string]: number } | null = null;
    let userSbert: number[] | null = null;
    let userNegSbert: number[] | null = null;
    if (likedIds.length) {
      const liked = await this.vecModel.find({ movieId: { $in: likedIds } }).lean();
      if (liked.length) {
        const acc = new Map<string, number>();
        let countEmb = 0;
        let dim = 0;
        for (const mv of liked) {
          for (const tw of mv.tfidf || []) {
            acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
          }
          if (mv.sbert && mv.sbert.length) {
            if (!userSbert) {
              userSbert = Array(mv.sbert.length).fill(0);
              dim = mv.sbert.length;
            }
            for (let i = 0; i < mv.sbert.length; i++) userSbert[i] += mv.sbert[i] || 0;
            countEmb++;
          }
        }
        const factor = 1 / liked.length;
        userVec = {};
        for (const [t, w] of acc.entries()) userVec[t] = w * factor;
        if (userSbert && countEmb > 0 && dim > 0) {
          for (let i = 0; i < dim; i++) userSbert[i] = userSbert[i] / countEmb;
        }
      }
    }
    if (dislikedIds.length) {
      const negs = await this.vecModel.find({ movieId: { $in: dislikedIds } }).lean();
      if (negs.length) {
        const acc = new Map<string, number>();
        let countEmb = 0;
        let dim = 0;
        for (const mv of negs) {
          for (const tw of mv.tfidf || []) acc.set(tw.term, (acc.get(tw.term) || 0) + tw.weight);
          if (mv.sbert && mv.sbert.length) {
            if (!userNegSbert) {
              userNegSbert = Array(mv.sbert.length).fill(0);
              dim = mv.sbert.length;
            }
            for (let i = 0; i < mv.sbert.length; i++) userNegSbert[i] += mv.sbert[i] || 0;
            countEmb++;
          }
        }
        const factor = 1 / negs.length;
        userNegVec = {};
        for (const [t, w] of acc.entries()) userNegVec[t] = w * factor;
        if (userNegSbert && countEmb > 0 && dim > 0) {
          for (let i = 0; i < dim; i++) userNegSbert[i] = userNegSbert[i] / countEmb;
        }
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

    // If user or negative vector exists, refine with cosine similarity batch
    if (userVec || userNegVec) {
      const poolIds = ranked.map((r) => r.movieId);
      const vecs = await this.vecModel.find({ movieId: { $in: poolIds } }).lean();
      const map = new Map<number, { tfidf: { term: string; weight: number }[] }>();
      for (const v of vecs) map.set(v.movieId, { tfidf: v.tfidf || [] });

      const userWeights = userVec ? Object.entries(userVec).map(([term, weight]) => ({ term, weight })) : [];
      for (const r of ranked) {
        const mv = map.get(r.movieId);
        if (!mv) continue;
        const cos = userVec ? cosineFromWeights(userWeights, mv.tfidf) : 0;
        let negCos = 0;
        if (userNegVec) {
          const userNegWeights = Object.entries(userNegVec).map(([term, weight]) => ({ term, weight }));
          negCos = cosineFromWeights(userNegWeights, mv.tfidf);
        }
        // SBERT cosine if available
        let cosSbert = 0;
        let negSbert = 0;
        if (userSbert && (mv as any).tfidf !== undefined) {
          // Fetch movie sbert vector separately if needed
        }
        // try get sbert vec via another query result
        // Since map holds only tfidf, refetching already happened above; we don't have sbert here.
        // Adjust: build a quick lookup for sbert too
        // We'll temporarily ignore and compute in a separate batch below

        // Blend TF-IDF cosine with base score; penalize negatives
        const wT = Number(process.env.BLEND_TFIDF ?? 0.2);
        const wB = Number(process.env.BLEND_BASE ?? 0.3);
        const wS = Number(process.env.BLEND_SBERT ?? 0.5);
        const wTN = Number(process.env.BLEND_TFIDF_NEG ?? 0.6);
        r.score = wB * r.score + wT * cos - wTN * negCos + (cosSbert ? wS * cosSbert : 0);
        r.reasons = [...r.reasons, `tfidf:${cos.toFixed(3)}`, userNegVec ? `neg:${negCos.toFixed(3)}` : ''];
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    // If SBERT user or negative vector exists, refine with SBERT cosine in batch
    if (userSbert || (userNegSbert && userNegSbert.length)) {
      const poolIds = ranked.map((r) => r.movieId);
      const vecs = await this.vecModel.find({ movieId: { $in: poolIds } }, { movieId: 1, sbert: 1 }).lean();
      const mapS = new Map<number, number[]>();
      for (const v of vecs) mapS.set(v.movieId, (v as any).sbert || []);
      const wS = Number(process.env.BLEND_SBERT ?? 0.5);
      const wSN = Number(process.env.BLEND_SBERT_NEG ?? 0.4);
      for (const r of ranked) {
        const mvS = mapS.get(r.movieId);
        if (!mvS?.length) continue;
        const cosS = userSbert ? cosineVec(userSbert, mvS) : 0;
        // negative SBERT penalty
        let negS = 0;
        if (userNegSbert?.length) negS = cosineVec(userNegSbert, mvS);
        r.score = r.score + wS * cosS - wSN * negS;
        r.reasons = [...r.reasons, `sbert:${cosS.toFixed(3)}`, userNegSbert ? `sneg:${negS.toFixed(3)}` : ''];
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

    const meta = { partial: false, source: 'local' } as any;
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
