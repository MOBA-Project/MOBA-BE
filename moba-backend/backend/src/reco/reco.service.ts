import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { Movie, MovieDocument } from '../movies/schemas/movie.schema';
import { MovieVector, MovieVectorDocument } from './schemas/movie-vector.schema';
import { cosineFromWeights } from './utils/text';

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

  async getCandidates(genreIds: number[], page = 1, size = 20) {
    // Prefer local DB if available; fallback to TMDB discover
    const query: any = genreIds.length ? { genres: { $in: genreIds } } : {};
    const local = await this.movieModel
      .find(query)
      .sort({ popularity: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();
    if (local?.length) {
      return local.map((m) => ({
        id: m.movieId,
        title: m.title,
        genre_ids: m.genres,
        overview: m.overview,
        popularity: m.popularity,
        vote_average: m.voteAverage,
        release_date: m.releaseDate,
        poster_path: m.posterPath,
      }));
    }
    try {
      const withGenres = genreIds.length ? `&with_genres=${genreIds.join(',')}` : '';
      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=ko-KR&region=KR&page=${page}${withGenres}`;
      const { data } = await axios.get(url);
      const results: TmdbMovie[] = data.results || [];
      return results.slice(0, size);
    } catch (e) {
      throw new HttpException('TMDB discover failed', HttpStatus.BAD_GATEWAY);
    }
  }

  private scoreMovie(
    movie: TmdbMovie,
    favoriteGenres: number[],
    weights = { alpha: 0.7, beta: 0.15, gamma: 0.15 },
  ) {
    const movieGenres = movie.genre_ids || (movie.genres ? movie.genres.map((g) => g.id) : []);
    const matchCount = movieGenres.filter((g) => favoriteGenres.includes(g)).length;
    const sim = favoriteGenres.length ? matchCount / favoriteGenres.length : 0;

    // popularity: 대략 0~100+ 범위 -> 0~1 정규화(간단 min-max 근사)
    const pop = Math.min(1, Math.max(0, (movie.popularity || 0) / 100));
    const vote = Math.min(1, Math.max(0, (movie.vote_average || 0) / 10));

    const score = weights.alpha * sim + weights.beta * pop + weights.gamma * vote;
    const reasons: string[] = [];
    if (matchCount > 0) reasons.push(`matchedGenres:${matchCount}`);
    if (movie.popularity) reasons.push(`popularity:${movie.popularity.toFixed(1)}`);
    if (movie.vote_average) reasons.push(`vote:${movie.vote_average.toFixed(1)}`);
    return { score, reasons };
  }

  async getPersonal(userId: string, size = 20) {
    const profile = await this.profileModel.findOne({ userId });
    const favoriteGenres = profile?.favoriteGenres || [];

    // Candidate pool: local DB by genre; fallback to TMDB
    const [p1, p2] = await Promise.all([
      this.getCandidates(favoriteGenres, 1, size),
      this.getCandidates(favoriteGenres, 2, size),
    ]);
    const poolMap = new Map<number, TmdbMovie>();
    ;[...p1, ...p2].forEach((m) => poolMap.set(m.id, m));
    const pool = Array.from(poolMap.values());

    // Build user vector from liked movies if available
    const likedIds = profile?.likedMovieIds || [];
    let userVec: { [term: string]: number } | null = null;
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

    const ranked = pool
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
        // Blend cosine with base score
        r.score = 0.6 * cos + 0.4 * r.score;
        r.reasons = [...r.reasons, `cos:${cos.toFixed(3)}`];
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    return ranked;
  }
}
