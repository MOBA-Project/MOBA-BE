import { Injectable, Logger } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private translationPipeline: any = null;
  private initPromise: Promise<void> | null = null;
  private readonly enabled: boolean;

  constructor() {
    // 환경변수로 번역 기능 활성화 여부 제어
    this.enabled = process.env.TRANSLATION_ENABLED?.toLowerCase() === 'true';

    if (this.enabled) {
      this.initPromise = this.initialize();
    }
  }

  private async initialize() {
    try {
      this.logger.log('번역 모델 초기화 중...');
      // Helsinki-NLP의 영한 번역 모델 사용 (소형 모델)
      this.translationPipeline = await pipeline(
        'translation',
        'Xenova/nllb-200-distilled-600M',
      );
      this.logger.log('번역 모델 초기화 완료');
    } catch (error) {
      this.logger.error('번역 모델 초기화 실패:', error);
      this.translationPipeline = null;
    }
  }

  /**
   * 영어 텍스트를 한국어로 번역
   * @param text 영어 텍스트
   * @returns 한국어 번역 결과 (실패 시 원문 반환)
   */
  async translateToKorean(text: string): Promise<string> {
    if (!this.enabled) {
      return text;
    }

    if (!text || text.trim() === '') {
      return text;
    }

    // 이미 한글이 포함된 경우 번역하지 않음
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
      return text;
    }

    try {
      // 초기화 대기
      if (this.initPromise) {
        await this.initPromise;
        this.initPromise = null;
      }

      if (!this.translationPipeline) {
        this.logger.warn('번역 파이프라인이 초기화되지 않음');
        return text;
      }

      // 번역 실행
      const result = await this.translationPipeline(text, {
        src_lang: 'eng_Latn', // 영어
        tgt_lang: 'kor_Hang', // 한국어
      });

      const translated = result[0]?.translation_text || text;
      this.logger.debug(`번역: "${text}" → "${translated}"`);
      return translated;
    } catch (error) {
      this.logger.error(`번역 실패: ${text}`, error);
      return text; // 실패 시 원문 반환
    }
  }

  /**
   * 배열의 텍스트들을 일괄 번역
   * @param texts 영어 텍스트 배열
   * @returns 한국어 번역 결과 배열
   */
  async translateBatch(texts: string[]): Promise<string[]> {
    if (!this.enabled || !texts || texts.length === 0) {
      return texts;
    }

    // 병렬 번역 (성능 개선)
    const promises = texts.map((text) => this.translateToKorean(text));
    return Promise.all(promises);
  }

  /**
   * 배우 정보 번역 (이름과 역할)
   */
  async translateCast(cast: Array<{ name: string; character: string }>): Promise<
    Array<{ name: string; character: string; nameKo?: string; characterKo?: string }>
  > {
    if (!this.enabled || !cast || cast.length === 0) {
      return cast;
    }

    const results = await Promise.all(
      cast.map(async (actor) => {
        const nameKo = await this.translateToKorean(actor.name || '');
        const characterKo = await this.translateToKorean(actor.character || '역할 정보 없음');

        return {
          ...actor,
          nameKo: nameKo !== actor.name ? nameKo : undefined,
          characterKo: characterKo !== actor.character ? characterKo : undefined,
        };
      }),
    );

    return results;
  }
}
