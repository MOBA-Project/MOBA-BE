import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SbertService {
  private readonly logger = new Logger(SbertService.name);
  private modelLoaded = false;
  private pipeline: any = null;

  private async ensureModel() {
    if (this.modelLoaded) return;
    try {
      // Lazy load to avoid startup cost; requires network or pre-cached weights
      // Model: all-MiniLM-L6-v2 (384d)
      // @ts-ignore
      const transformers = await import('@xenova/transformers');
      const modelId = process.env.SBERT_MODEL || 'Xenova/all-MiniLM-L6-v2';
      // @ts-ignore
      this.pipeline = await transformers.pipeline('feature-extraction', modelId);
      this.modelLoaded = true;
    } catch (e: any) {
      this.logger.warn(`SBERT model load failed: ${e?.message}`);
      throw new Error('SBERT unavailable');
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    await this.ensureModel();
    if (!this.pipeline) throw new Error('SBERT unavailable');
    const outs: number[][] = [];
    for (const t of texts) {
      // @ts-ignore
      const output = await this.pipeline(t, { pooling: 'mean', normalize: true });
      outs.push(Array.from(output.data));
    }
    return outs;
  }

  // Combine fields into a single textual representation for embedding
  buildMovieText(args: { overview?: string; keywords?: string[]; cast?: string[]; director?: string }): string {
    const kw = (args.keywords || []).join(' ');
    const people = [...(args.cast || []), args.director || ''].join(' ');
    return [args.overview || '', kw, people].filter(Boolean).join(' \n ');
  }
}
