export interface PronunciationEvaluation {
  score: number;
  passed: boolean;
  normalizedExpected: string;
  normalizedActual: string;
}

export interface PronunciationEvaluatorPort {
  evaluate(
    expected: string,
    actual: string,
    acceptedAnswers?: readonly string[],
  ): PronunciationEvaluation;
}
