import { LEARNING_TOPICS } from '../../../core/domain/models/learning-topics';
import { EN_NL_SEED_DECK } from './en-nl-seed-deck';

describe('English-Dutch seed deck', () => {
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
