import { InjectionToken } from '@angular/core';

import { AnswerFeedbackPort } from './ports/answer-feedback.port';
import { CardRepositoryPort } from './ports/card-repository.port';
import { PronunciationEvaluatorPort } from './ports/pronunciation-evaluator.port';
import { ReviewSchedulerPort } from './ports/review-scheduler.port';
import { SpeechRecognizerPort } from './ports/speech-recognizer.port';
import { TextToSpeechPort } from './ports/text-to-speech.port';

export const ANSWER_FEEDBACK = new InjectionToken<AnswerFeedbackPort>(
  'AnswerFeedbackPort',
);
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
export const TEXT_TO_SPEECH = new InjectionToken<TextToSpeechPort>(
  'TextToSpeechPort',
);
