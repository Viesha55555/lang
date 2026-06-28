import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Sm2SchedulerService } from './core/domain/services/sm2-scheduler.service';
import { SimplePronunciationEvaluatorService } from './core/domain/services/simple-pronunciation-evaluator.service';
import {
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SPEECH_RECOGNIZER,
} from './core/domain/tokens';
import { WebSpeechRecognizerService } from './infrastructure/speech/web-speech-recognizer.service';
import { LocalStorageCardRepositoryService } from './infrastructure/storage/local-storage-card-repository.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: SPEECH_RECOGNIZER, useExisting: WebSpeechRecognizerService },
    { provide: CARD_REPOSITORY, useExisting: LocalStorageCardRepositoryService },
    {
      provide: PRONUNCIATION_EVALUATOR,
      useExisting: SimplePronunciationEvaluatorService,
    },
    { provide: REVIEW_SCHEDULER, useExisting: Sm2SchedulerService },
  ],
};
