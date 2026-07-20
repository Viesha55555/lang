import {
  analyzeSpeakingChallenge,
  SpeakingChallengePrompt,
} from './speaking-challenge-analysis';

const question: SpeakingChallengePrompt = {
  text: 'Wat heb je gisteren gedaan?',
  intent: 'past-activity',
  minimumWords: 3,
};

const cards = [
  { id: 'home', targetText: 'ik was thuis' },
  { id: 'work', targetText: 'ik werkte' },
  { id: 'go', targetText: 'ik ben gegaan' },
  { id: 'buy', targetText: 'ik heb gekocht' },
  { id: 'eat', targetText: 'ik had al gegeten' },
  { id: 'leave', targetText: 'hij is vertrokken' },
];

describe('analyzeSpeakingChallenge', () => {
  it('accepts a relevant grammatical past answer', () => {
    const result = analyzeSpeakingChallenge('Ik werkte de hele dag', question, cards);

    expect(result.relevance).toBe('relevant');
    expect(result.grammar).toBe('correct');
    expect(result.learnedPhrases).toContain(jasmine.objectContaining({
      phrase: 'ik werkte', usage: 'variant',
    }));
  });

  it('accepts a natural answer without requiring the word gisteren', () => {
    const result = analyzeSpeakingChallenge('Ik was thuis', question, cards);

    expect(result.relevance).toBe('relevant');
    expect(result.grammar).toBe('correct');
  });

  it('detects the wrong perfect-tense auxiliary as an attempted phrase', () => {
    const result = analyzeSpeakingChallenge('Ik heb gegaan trouwens', question, cards);

    expect(result.grammar).toBe('understandable-with-errors');
    expect(result.correction?.correctedText).toBe('Ik ben gegaan trouwens');
    expect(result.learnedPhrases).toContain(jasmine.objectContaining({
      phrase: 'ik ben gegaan', usage: 'attempted',
    }));
  });

  it('corrects participle word order', () => {
    const result = analyzeSpeakingChallenge('Ik heb gekocht een kaas', question, cards);

    expect(result.grammar).toBe('understandable-with-errors');
    expect(result.correction?.correctedText).toBe('Ik heb een kaas gekocht');
    expect(result.learnedPhrases).toContain(jasmine.objectContaining({
      phrase: 'ik heb gekocht', usage: 'attempted',
    }));
  });

  it('repairs a likely een/en recognition error while correcting word order', () => {
    const result = analyzeSpeakingChallenge(
      'Ik heb gekocht en maaltijd',
      question,
      cards,
    );

    expect(result.grammar).toBe('understandable-with-errors');
    expect(result.correction).toEqual({
      correctedText: 'Ik heb een maaltijd gekocht',
      note: "Use 'een' as the article, and put the object before the past participle.",
    });
  });

  it('does not treat an incomplete phrase as a good answer', () => {
    const result = analyzeSpeakingChallenge('Ik heb nooit gedaan', question, cards);

    expect(result.grammar).toBe('needs-retry');
  });

  it('does not count semantically incoherent speech as correct', () => {
    const result = analyzeSpeakingChallenge('Ik heb geld vertrokken', question, cards);

    expect(result.grammar).toBe('needs-retry');
    expect(result.learnedPhrases).toContain(jasmine.objectContaining({
      phrase: 'hij is vertrokken', usage: 'attempted',
    }));
  });

  it('accepts a different valid perfect-tense answer', () => {
    const result = analyzeSpeakingChallenge('Ik heb gisteren al gegeten', question, cards);

    expect(result.relevance).toBe('relevant');
    expect(result.grammar).toBe('correct');
    expect(result.learnedPhrases).toContain(jasmine.objectContaining({
      phrase: 'ik had al gegeten', usage: 'attempted',
    }));
  });

  it('rejects a present-tense non-answer and corrects gaan with tijd', () => {
    const result = analyzeSpeakingChallenge(
      'ik ga tijd',
      question,
      [{ id: 'had-time', targetText: 'ik had tijd' }],
    );

    expect(result.relevance).toBe('not-relevant');
    expect(result.grammar).toBe('needs-retry');
    expect(result.correction).toEqual({
      correctedText: 'Ik had tijd',
      note: "To say that you had time, use the past tense of 'hebben': 'ik had tijd'.",
    });
  });
});
