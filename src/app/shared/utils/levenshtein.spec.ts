import { levenshteinDistance } from './levenshtein';

describe('levenshteinDistance', () => {
  it('returns zero for equal values', () => {
    expect(levenshteinDistance('appel', 'appel')).toBe(0);
  });

  it('counts insertions, deletions, and substitutions', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('', 'huis')).toBe(4);
  });
});
