import {
  SentenceCorrectionRequest,
  SentenceCorrectionResult,
} from '../models/sentence-correction.model';

export interface SentenceCorrectionPort {
  correct(
    request: SentenceCorrectionRequest,
  ): Promise<SentenceCorrectionResult>;
}
