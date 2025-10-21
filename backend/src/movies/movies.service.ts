import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { TranslationService } from './translation.service';

@Injectable()
export class MoviesService {
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly API_KEY = process.env.TMDB_API_KEY;

  constructor(private readonly translationService: TranslationService) {}

  async getMovies(page = 1, genre?: string) {
    try {
      const genreMap = {
        action: 28,
        animation: 16,
        comedy: 35,
        crime: 80,
        family: 10751,
        fantasy: 14,
        horror: 27,
        thriller: 53,
        romance: 10749,
        'sci-fi': 878,
      };

      const genreId = genre ? genreMap[genre] : '';
      const url = `${this.BASE_URL}/discover/movie?language=ko-KR&region=KR&page=${page}&api_key=${this.API_KEY}${
        genreId ? `&with_genres=${genreId}` : ''
      }`;

      const { data } = await axios.get(url);
      return data;
    } catch (error) {
      throw new HttpException('TMDB fetch failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getMovieDetail(id: string) {
    const url = `${this.BASE_URL}/movie/${id}?language=ko-KR&api_key=${this.API_KEY}`;
    const { data } = await axios.get(url);
    return data;
  }

  async getMovieVideos(id: string) {
    const url = `${this.BASE_URL}/movie/${id}/videos?language=ko-KR&api_key=${this.API_KEY}`;
    const { data } = await axios.get(url);
    return data;
  }

  async searchMovies(query: string, page = 1) {
    const base = `${this.BASE_URL}/search/movie?api_key=${this.API_KEY}&page=${page}&include_adult=false`;
    let url = `${base}&language=ko-KR&query=${encodeURIComponent(query)}`;
    let { data } = await axios.get(url);

    // 결과 없으면 영문으로 재시도
    if (data.results.length === 0) {
      url = `${base}&language=en-US&query=${encodeURIComponent(query)}`;
      ({ data } = await axios.get(url));
    }

    return data;
  }

  async getMovieCredits(id: string) {
    const url = `${this.BASE_URL}/movie/${id}/credits?language=ko-KR&api_key=${this.API_KEY}`;
    const { data } = await axios.get(url);
    return data;
  }
}
