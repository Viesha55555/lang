import { LEARNING_TOPICS } from '../../../core/domain/models/learning-topics';
import { EN_NL_SEED_DECK } from './en-nl-seed-deck';
import { SEED_CARD_REDIRECTS } from './seed-card-redirects';

describe('English-Dutch seed deck', () => {
  it('has no identical translation pairs across levels and valid duplicate redirects', () => {
    const cards = EN_NL_SEED_DECK.flatMap(section => section.cards);
    const pairs = cards.map(card => JSON.stringify([
      card.sourceText.trim().toLowerCase(), card.targetText.trim().toLowerCase(),
    ]));
    expect(new Set(pairs).size).toBe(pairs.length);
    const ids = new Set(cards.map(card => card.id));
    for (const [retired, survivor] of Object.entries(SEED_CARD_REDIRECTS)) {
      expect(ids.has(retired)).toBeFalse();
      expect(ids.has(survivor)).toBeTrue();
    }
  });
  it('uses unique card IDs and numeric ID prefixes within each level', () => {
    for (const section of EN_NL_SEED_DECK) {
      const ids = section.cards.map((card) => card.id);
      const numericPrefixes = ids.map((id) => id.match(/^\w+-(\d+)-/)?.[1]);

      expect(new Set(ids).size).toBe(ids.length);
      expect(numericPrefixes.every(Boolean)).toBeTrue();
      expect(new Set(numericPrefixes).size).toBe(numericPrefixes.length);
    }
  });

  it('assigns every card to a known topic', () => {
    const knownTopicIds = new Set(LEARNING_TOPICS.map((topic) => topic.id));

    for (const section of EN_NL_SEED_DECK) {
      expect(section.cards.every((card) => card.topicId !== undefined)).toBeTrue();
      expect(
        section.cards.every((card) =>
          card.topicId ? knownTopicIds.has(card.topicId) : false,
        ),
      ).toBeTrue();
    }
  });

  it('does not repeat an English prompt within one level', () => {
    for (const section of EN_NL_SEED_DECK) {
      const prompts = section.cards.map((card) => card.sourceText.toLowerCase());

      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });
});
