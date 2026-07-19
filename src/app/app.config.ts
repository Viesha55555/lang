import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { Sm2SchedulerService } from './core/domain/services/sm2-scheduler.service';
import { SimplePronunciationEvaluatorService } from './core/domain/services/simple-pronunciation-evaluator.service';
import {
  ANSWER_FEEDBACK,
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SPEECH_RECOGNIZER,
  TEXT_TO_SPEECH,
} from './core/domain/tokens';
import { WebAudioAnswerFeedbackService } from './infrastructure/audio/web-audio-answer-feedback.service';
import { WebSpeechRecognizerService } from './infrastructure/speech/web-speech-recognizer.service';
import { WebSpeechSynthesisService } from './infrastructure/speech/web-speech-synthesis.service';
import { LocalStorageCardRepositoryService } from './infrastructure/storage/local-storage-card-repository.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: ANSWER_FEEDBACK, useExisting: WebAudioAnswerFeedbackService },
    { provide: SPEECH_RECOGNIZER, useExisting: WebSpeechRecognizerService },
    { provide: TEXT_TO_SPEECH, useExisting: WebSpeechSynthesisService },
    { provide: CARD_REPOSITORY, useExisting: LocalStorageCardRepositoryService },
    {
      provide: PRONUNCIATION_EVALUATOR,
      useExisting: SimplePronunciationEvaluatorService,
    },
    { provide: REVIEW_SCHEDULER, useExisting: Sm2SchedulerService },
  ],
};
