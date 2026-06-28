import { InjectionToken } from '@angular/core';

import { CardRepositoryPort } from './ports/card-repository.port';
import { PronunciationEvaluatorPort } from './ports/pronunciation-evaluator.port';
import { ReviewSchedulerPort } from './ports/review-scheduler.port';
import { SpeechRecognizerPort } from './ports/speech-recognizer.port';

export const SPEECH_RECOGNIZER = new InjectionToken<SpeechRecognizerPort>(
  'SpeechRecognizerPort',
);
export const CARD_REPOSITORY = new InjectionToken<CardRepositoryPort>(
  'CardRepositoryPort',
);
export const REVIEW_SCHEDULER = new InjectionToken<ReviewSchedulerPort>(
  'ReviewSchedulerPort',
);
export const PRONUNCIATION_EVALUATOR =
  new InjectionToken<PronunciationEvaluatorPort>(
    'PronunciationEvaluatorPort',
  );
