import a1Cards from './a1.en-nl.json';
import a2Cards from './a2.en-nl.json';
import b1Cards from './b1.en-nl.json';

import { CardLevel } from '../../../core/domain/models/flashcard.model';
import type { TopicId } from '../../../core/domain/models/learning-topic.model';

export interface SeedCardData {
  readonly id: string;
  readonly sourceText: string;
  readonly targetText: string;
  readonly topicId?: TopicId;
  readonly acceptedAnswers?: readonly string[];
}

export interface SeedDeckSection {
  readonly level: CardLevel;
  readonly targetEntryCount: number;
  readonly cards: readonly SeedCardData[];
}

export interface SeedCardWithLevel extends SeedCardData {
  readonly level: CardLevel;
}

export const EN_NL_SOURCE_LANGUAGE = 'en-US';
export const EN_NL_TARGET_LANGUAGE = 'nl-NL';

export const EN_NL_SEED_DECK: readonly SeedDeckSection[] = [
  {
    level: 'A1',
    targetEntryCount: 500,
    cards: a1Cards as readonly SeedCardData[],
  },
  {
    level: 'A2',
    targetEntryCount: 1000,
    cards: a2Cards as readonly SeedCardData[],
  },
  {
    level: 'B1',
    targetEntryCount: 1500,
    cards: b1Cards as readonly SeedCardData[],
  },
];

export function getEnNlSeedCards(): readonly SeedCardWithLevel[] {
  return EN_NL_SEED_DECK.flatMap((section) =>
    section.cards.map((card) => ({
      ...card,
      level: section.level,
    })),
  );
}
