import { Injectable } from '@angular/core';

import {
  PronunciationEvaluation,
  PronunciationEvaluatorPort,
} from '../ports/pronunciation-evaluator.port';
import { levenshteinDistance } from '../../../shared/utils/levenshtein';
import { normalizeText } from '../../../shared/utils/normalize-text';

const DUTCH_NUMBER_WORDS: Readonly<Record<string, string>> = {
  '0': 'nul',
  '1': 'een',
  '2': 'twee',
  '3': 'drie',
  '4': 'vier',
  '5': 'vijf',
  '6': 'zes',
  '7': 'zeven',
  '8': 'acht',
  '9': 'negen',
  '10': 'tien',
};

@Injectable({ providedIn: 'root' })
export class SimplePronunciationEvaluatorService
  implements PronunciationEvaluatorPort
{
  evaluate(
    expected: string,
    actual: string,
    acceptedAnswers: readonly string[] = [],
  ): PronunciationEvaluation {
    const normalizedActual = this.expandRecognizedDutchNumbers(
      normalizeText(actual),
    );
    const candidates = [expected, ...acceptedAnswers].map((candidate) =>
      this.expandRecognizedDutchNumbers(normalizeText(candidate)),
    );

    if (!normalizedActual) {
      return {
        score: 0,
        passed: false,
        normalizedExpected: candidates[0] ?? '',
        normalizedActual,
      };
    }

    const best = candidates
      .map((normalizedExpected) => ({
        normalizedExpected,
        score: this.similarity(normalizedExpected, normalizedActual),
      }))
      .reduce((currentBest, candidate) =>
        candidate.score > currentBest.score ? candidate : currentBest,
      );

    return {
      score: best.score,
      passed: best.score >= 0.8,
      normalizedExpected: best.normalizedExpected,
      normalizedActual,
    };
  }

  private similarity(expected: string, actual: string): number {
    const maxLength = Math.max(expected.length, actual.length, 1);
    return Math.max(0, 1 - levenshteinDistance(expected, actual) / maxLength);
  }

  private expandRecognizedDutchNumbers(text: string): string {
    return text
      .split(' ')
      .map((word) => DUTCH_NUMBER_WORDS[word] ?? word)
      .join(' ');
  }
}
