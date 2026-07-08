import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  OLLAMA_CHAT_ENDPOINT,
  OLLAMA_SENTENCE_CORRECTION_MODEL,
  OllamaSentenceCorrectionService,
} from './ollama-sentence-correction.service';
import {
  SentenceCorrectionRequest,
  SentenceCorrectionResult,
} from '../../core/domain/models/sentence-correction.model';

describe('OllamaSentenceCorrectionService', () => {
  let service: OllamaSentenceCorrectionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: OLLAMA_CHAT_ENDPOINT,
          useValue: 'http://localhost:11434/api/chat',
        },
        {
          provide: OLLAMA_SENTENCE_CORRECTION_MODEL,
          useValue: 'qwen2.5:1.5b',
        },
      ],
    });

    service = TestBed.inject(OllamaSentenceCorrectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('sends the correction request to local Qwen through Ollama chat', async () => {
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
    const correction: SentenceCorrectionResult = {
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
    const outbound = http.expectOne('http://localhost:11434/api/chat');

    expect(outbound.request.method).toBe('POST');
    expect(outbound.request.body.model).toBe('qwen2.5:1.5b');
    expect(outbound.request.body.stream).toBeFalse();
    expect(outbound.request.body.format).toBe('json');
    expect(outbound.request.body.messages[0].content).toContain(
      'Do not chat freely.',
    );
    expect(outbound.request.body.messages[0].content).toContain(
      '"newPhraseCards": { "english": string, "dutch": string }[]',
    );
    expect(outbound.request.body.messages[0].content).toContain(
      'suggest "kaartje" when appropriate',
    );
    expect(outbound.request.body.messages[1].content).toBe(
      JSON.stringify(request),
    );

    outbound.flush({
      message: {
        content: JSON.stringify({
          corrected: correction.correctedText,
          shortFeedback: correction.shortFeedback,
          usedWords: correction.usedWords,
          missingWords: correction.missingWords,
          speakPractice: correction.speakPractice,
          naturalAlternatives: correction.naturalAlternatives,
          newPhraseCards: correction.newPhraseCards,
        }),
      },
    });

    await expectAsync(resultPromise).toBeResolvedTo(correction);
  });

  it('reports invalid JSON from Ollama as a correction error', async () => {
    const request: SentenceCorrectionRequest = {
      sourceLanguage: 'en-US',
      targetLanguage: 'nl-NL',
      submittedText: 'Vandaag ik ga tapijt verwijderen.',
      requiredWords: [],
      maxCorrections: 1,
      maxPracticeSentences: 1,
    };

    const resultPromise = service.correct(request);
    const outbound = http.expectOne('http://localhost:11434/api/chat');

    outbound.flush({
      message: {
        content: 'Corrected: Vandaag ga ik het tapijt verwijderen.',
      },
    });

    await expectAsync(resultPromise).toBeRejectedWithError(
      'Ollama returned correction output that was not JSON.',
    );
  });
});
