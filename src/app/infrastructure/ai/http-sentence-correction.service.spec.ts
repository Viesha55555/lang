import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import {
  HttpSentenceCorrectionService,
  SENTENCE_CORRECTION_ENDPOINT,
} from './http-sentence-correction.service';
import {
  SentenceCorrectionRequest,
  SentenceCorrectionResult,
} from '../../core/domain/models/sentence-correction.model';

describe('HttpSentenceCorrectionService', () => {
  let service: HttpSentenceCorrectionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SENTENCE_CORRECTION_ENDPOINT,
          useValue: '/language-model/sentence-corrections',
        },
      ],
    });

    service = TestBed.inject(HttpSentenceCorrectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts the app contract to the configured correction endpoint', async () => {
    const request: SentenceCorrectionRequest = {
      sourceLanguage: 'en-US',
      targetLanguage: 'nl-NL',
      submittedText: 'Vandaag ik ga tapijt verwijderen.',
      requiredWords: [
        {
          text: 'het tapijt',
          translation: 'the carpet',
          language: 'nl-NL',
          cardId: 'a2-0001-carpet',
        },
      ],
      maxCorrections: 1,
      maxPracticeSentences: 1,
    };
    const response: SentenceCorrectionResult = {
      originalText: request.submittedText,
      correctedText: 'Vandaag ga ik het tapijt verwijderen.',
      shortFeedback: "Use verb-second word order after 'Vandaag'.",
      usedWords: ['het tapijt'],
      missingWords: [],
      speakPractice: ['Vandaag ga ik het tapijt verwijderen.'],
      naturalAlternatives: [
        {
          original: 'ticket',
          alternative: 'kaartje',
          note: 'Kaartje is very common for public transport and events.',
        },
      ],
      newPhraseCards: [
        {
          english: 'Today I am removing the carpet.',
          dutch: 'Vandaag ga ik het tapijt verwijderen.',
        },
      ],
    };

    const resultPromise = service.correct(request);
    const outbound = http.expectOne('/language-model/sentence-corrections');

    expect(outbound.request.method).toBe('POST');
    expect(outbound.request.body).toEqual(request);

    outbound.flush(response);

    await expectAsync(resultPromise).toBeResolvedTo(response);
  });
});
