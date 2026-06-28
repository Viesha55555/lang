import { normalizeText } from './normalize-text';

describe('normalizeText', () => {
  it('normalizes casing, punctuation, diacritics, and whitespace', () => {
    expect(normalizeText('  HéLLo,   Wörld!  ')).toBe('hello world');
  });

  it('preserves letters and numbers from non-English scripts', () => {
    expect(normalizeText(' Привет № 2 ')).toBe('привет 2');
  });
});
