import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';

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

    // 후보군: 선호 장르 discover에서 상위 2페이지 정도 수집
    const [p1, p2] = await Promise.all([
      this.getCandidates(favoriteGenres, 1, size),
      this.getCandidates(favoriteGenres, 2, size),
    ]);
    const poolMap = new Map<number, TmdbMovie>();
    [...p1, ...p2].forEach((m) => poolMap.set(m.id, m));
    const pool = Array.from(poolMap.values());

    const ranked = pool
      .map((m) => {
        const { score, reasons } = this.scoreMovie(m, favoriteGenres);
        return {
          movieId: m.id,
          title: m.title,
          posterPath: m.poster_path,
          score,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, size);

    return ranked;
  }
}

