import { SimplePronunciationEvaluatorService } from './simple-pronunciation-evaluator.service';

describe('SimplePronunciationEvaluatorService', () => {
  let service: SimplePronunciationEvaluatorService;

  beforeEach(() => {
    service = new SimplePronunciationEvaluatorService();
  });

  it('passes an exact normalized answer', () => {
    const result = service.evaluate('Ik werk vandaag', 'ik werk vandaag!');

    expect(result.score).toBe(1);
    expect(result.passed).toBeTrue();
  });

  it('fails an empty answer', () => {
    const result = service.evaluate('appel', '  ');

    expect(result.score).toBe(0);
    expect(result.passed).toBeFalse();
  });

  it('uses the closest accepted answer', () => {
    const result = service.evaluate('ik ben', "'k ben", ["'k ben"]);

    expect(result.score).toBe(1);
    expect(result.normalizedExpected).toBe('k ben');
  });

  it('passes at the 0.8 threshold', () => {
    const result = service.evaluate('abcde', 'abcdx');

    expect(result.score).toBeCloseTo(0.8);
    expect(result.passed).toBeTrue();
  });
});
