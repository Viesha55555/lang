import { Injectable } from '@angular/core';

import {
  PronunciationEvaluation,
  PronunciationEvaluatorPort,
} from '../ports/pronunciation-evaluator.port';
import { levenshteinDistance } from '../../../shared/utils/levenshtein';
import { normalizeText } from '../../../shared/utils/normalize-text';

@Injectable({ providedIn: 'root' })
export class SimplePronunciationEvaluatorService
  implements PronunciationEvaluatorPort
{
  evaluate(
    expected: string,
    actual: string,
    acceptedAnswers: readonly string[] = [],
  ): PronunciationEvaluation {
    const normalizedActual = normalizeText(actual);
    const candidates = [expected, ...acceptedAnswers].map(normalizeText);

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
}
