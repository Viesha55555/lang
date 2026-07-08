import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { Sm2SchedulerService } from './core/domain/services/sm2-scheduler.service';
import { SimplePronunciationEvaluatorService } from './core/domain/services/simple-pronunciation-evaluator.service';
import {
  ANSWER_FEEDBACK,
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SENTENCE_CORRECTOR,
  SPEECH_RECOGNIZER,
} from './core/domain/tokens';
import { OllamaSentenceCorrectionService } from './infrastructure/ai/ollama-sentence-correction.service';
import { WebAudioAnswerFeedbackService } from './infrastructure/audio/web-audio-answer-feedback.service';
import { WebSpeechRecognizerService } from './infrastructure/speech/web-speech-recognizer.service';
import { LocalStorageCardRepositoryService } from './infrastructure/storage/local-storage-card-repository.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    { provide: ANSWER_FEEDBACK, useExisting: WebAudioAnswerFeedbackService },
    { provide: SPEECH_RECOGNIZER, useExisting: WebSpeechRecognizerService },
    { provide: CARD_REPOSITORY, useExisting: LocalStorageCardRepositoryService },
    {
      provide: PRONUNCIATION_EVALUATOR,
      useExisting: SimplePronunciationEvaluatorService,
    },
    { provide: REVIEW_SCHEDULER, useExisting: Sm2SchedulerService },
    {
      provide: SENTENCE_CORRECTOR,
      useExisting: OllamaSentenceCorrectionService,
    },
  ],
};
