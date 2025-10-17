import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Movie, MovieDocument } from '../movies/schemas/movie.schema';
import { MovieVector, MovieVectorDocument } from './schemas/movie-vector.schema';
import { VectorMeta, VectorMetaDocument, VectorTerm, VectorTermDocument } from './schemas/vector-term.schema';
import { buildMovieTerms, tfidfWeights } from './utils/text';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly API_KEY = process.env.TMDB_API_KEY;

  constructor(
    @InjectModel(Movie.name) private readonly movieModel: Model<MovieDocument>,
    @InjectModel(MovieVector.name) private readonly vecModel: Model<MovieVectorDocument>,
    @InjectModel(VectorTerm.name) private readonly termModel: Model<VectorTermDocument>,
    @InjectModel(VectorMeta.name) private readonly metaModel: Model<VectorMetaDocument>,
  ) {}

  private async getDocCount(): Promise<number> {
    const meta = await this.metaModel.findOne({ key: 'doc_count' });
    return meta?.value || 0;
  }

  private async incDocCount(by = 1) {
    await this.metaModel.findOneAndUpdate(
      { key: 'doc_count' },
      { $inc: { value: by } },
      { upsert: true },
    );
  }

  private async incDfForTerms(terms: string[]) {
    if (!terms.length) return;
    const ops = terms.map((t) => ({
      updateOne: {
        filter: { term: t },
        update: { $inc: { df: 1 } },
        upsert: true,
      },
    }));
    await this.termModel.bulkWrite(ops, { ordered: false }).catch(() => void 0);
  }

  private async dfLookup(term: string): Promise<number> {
    const found = await this.termModel.findOne({ term }).lean();
    return found?.df || 0;
  }

  async syncDiscover(genres: number[], pages = 1) {
    for (let p = 1; p <= pages; p++) {
      const withGenres = genres.length ? `&with_genres=${genres.join(',')}` : '';
      const url = `${this.BASE_URL}/discover/movie?api_key=${this.API_KEY}&language=ko-KR&region=KR&page=${p}${withGenres}`;
      const { data } = await axios.get(url);
      const results: any[] = data.results || [];
      for (const r of results) {
        await this.syncMovieById(r.id).catch((e) => this.logger.warn(`sync ${r.id} failed: ${e?.message}`));
      }
    }
  }

  async syncMovieById(id: number) {
    const detailUrl = `${this.BASE_URL}/movie/${id}?api_key=${this.API_KEY}&language=ko-KR`;
    const kwUrl = `${this.BASE_URL}/movie/${id}/keywords?api_key=${this.API_KEY}`;
    const creditsUrl = `${this.BASE_URL}/movie/${id}/credits?api_key=${this.API_KEY}&language=ko-KR`;

    const [{ data: d }, { data: kwd }, { data: cr }] = await Promise.all([
      axios.get(detailUrl),
      axios.get(kwUrl),
      axios.get(creditsUrl),
    ]);

    const keywords: string[] = (kwd?.keywords || kwd?.keywords?.keywords || kwd?.keywords || kwd?.results || [])
      .map((x: any) => x?.name)
      .filter(Boolean);
    const cast: string[] = (cr?.cast || []).slice(0, 10).map((c: any) => c?.name).filter(Boolean);
    const director: string | undefined = (cr?.crew || []).find((c: any) => c?.job === 'Director')?.name;

    const exists = await this.movieModel.findOne({ movieId: d.id });

    const movie = await this.movieModel.findOneAndUpdate(
      { movieId: d.id },
      {
        $set: {
          title: d.title,
          genres: (d.genres || d.genre_ids || []).map((g: any) => (typeof g === 'number' ? g : g.id)),
          overview: d.overview,
          keywords,
          cast,
          director,
          voteAverage: d.vote_average || 0,
          popularity: d.popularity || 0,
          releaseDate: d.release_date,
          posterPath: d.poster_path,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Update doc_count for brand-new movies only
    if (!exists) await this.incDocCount(1);

    // Terms and DF updates (only new terms for this movie)
    const newTerms = buildMovieTerms({
      overview: movie.overview || '',
      keywords: movie.keywords,
      cast: movie.cast,
      director: movie.director,
    });
    const oldTerms = exists?.terms || [];
    const setNew = new Set(newTerms);
    const setOld = new Set(oldTerms);
    const toInc: string[] = [];
    for (const t of setNew) if (!setOld.has(t)) toInc.push(t);
    await this.movieModel.updateOne({ _id: movie._id }, { $set: { terms: Array.from(setNew) } });
    if (toInc.length) await this.incDfForTerms(toInc);

    // Compute and store TF-IDF vector
    const docCount = await this.getDocCount();
    const dfCache = new Map<string, number>();
    const lookup = (term: string) => {
      if (dfCache.has(term)) return dfCache.get(term)!;
      return 0; // lazy; below we prefetch
    };

    // Prefetch dfs for all terms in this doc
    const allTerms = Array.from(setNew);
    if (allTerms.length) {
      const termDocs = await this.termModel.find({ term: { $in: allTerms } }).lean();
      for (const td of termDocs) dfCache.set(td.term, td.df || 0);
    }

    const weights = tfidfWeights(newTerms, lookup, docCount, 50);
    await this.vecModel.findOneAndUpdate(
      { movieId: movie.movieId },
      { $set: { movieId: movie.movieId, genres: movie.genres, tfidf: weights } },
      { upsert: true },
    );

    return movie;
  }
}

