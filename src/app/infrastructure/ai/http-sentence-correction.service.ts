import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  SentenceCorrectionRequest,
  SentenceCorrectionResult,
} from '../../core/domain/models/sentence-correction.model';
import { SentenceCorrectionPort } from '../../core/domain/ports/sentence-correction.port';

export const SENTENCE_CORRECTION_ENDPOINT = new InjectionToken<string>(
  'SentenceCorrectionEndpoint',
  {
    providedIn: 'root',
    factory: () => '/api/sentence-corrections',
  },
);

@Injectable({ providedIn: 'root' })
export class HttpSentenceCorrectionService implements SentenceCorrectionPort {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(SENTENCE_CORRECTION_ENDPOINT);

  async correct(
    request: SentenceCorrectionRequest,
  ): Promise<SentenceCorrectionResult> {
    return firstValueFrom(
      this.http.post<SentenceCorrectionResult>(this.endpoint, request),
    );
  }
}
