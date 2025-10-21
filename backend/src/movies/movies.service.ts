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
    // 한국어로 먼저 요청
    const koUrl = `${this.BASE_URL}/movie/${id}/credits?language=ko-KR&api_key=${this.API_KEY}`;
    const { data: koData } = await axios.get(koUrl);

    // 영어로도 요청 (fallback용)
    const enUrl = `${this.BASE_URL}/movie/${id}/credits?language=en-US&api_key=${this.API_KEY}`;
    const { data: enData } = await axios.get(enUrl);

    // 한국어 데이터와 영어 데이터 병합
    const mergedCast = koData.cast.map((koCast: any, idx: number) => {
      const enCast = enData.cast[idx] || {};
      return {
        ...koCast,
        // 한국어가 없으면 영어 사용
        name: koCast.name || enCast.name,
        character: koCast.character || enCast.character || '역할 정보 없음',
        // 원본 영어 데이터도 함께 제공
        original_name: enCast.name,
      };
    });

    // 번역 서비스로 추가 번역 (영어 이름이 있는 경우)
    const translatedCast = await this.translationService.translateCast(
      mergedCast.map((actor: any) => ({
        name: actor.name,
        character: actor.character,
      })),
    );

    // 최종 결과 생성
    const finalCast = mergedCast.map((actor: any, idx: number) => {
      const translated = translatedCast[idx];
      return {
        ...actor,
        // 번역된 한국어 제공 (있는 경우)
        name_ko: translated.nameKo,
        character_ko: translated.characterKo,
      };
    });

    return {
      ...koData,
      cast: finalCast,
    };
  }
}
