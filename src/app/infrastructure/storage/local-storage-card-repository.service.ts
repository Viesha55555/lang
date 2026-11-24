import { Injectable } from '@angular/core';

import { CardLevel, Flashcard } from '../../core/domain/models/flashcard.model';
import { CardRepositoryPort } from '../../core/domain/ports/card-repository.port';
import {
  EN_NL_SOURCE_LANGUAGE,
  EN_NL_TARGET_LANGUAGE,
  getEnNlSeedCards,
} from './seed-data/en-nl-seed-deck';
import { SEED_CARD_REDIRECTS } from './seed-data/seed-card-redirects';

const STORAGE_KEY = 'spoken-flashcards.cards.v2';
const RETIRED_CARD_IDS = new Set(['b1-0108-i-have-eaten']);

@Injectable({ providedIn: 'root' })
export class LocalStorageCardRepositoryService implements CardRepositoryPort {
  async getAllCards(): Promise<Flashcard[]> {
    return this.loadAll();
  }

  async getDueCards(now: Date, limit: number): Promise<Flashcard[]> {
    return this.loadAll()
      .filter((card) => new Date(card.dueAt).getTime() <= now.getTime())
      .sort((first, second) => {
        const dueDifference =
          new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime();

        return dueDifference || first.repetition - second.repetition;
      })
      .slice(0, Math.max(0, limit));
  }

  async getById(id: string): Promise<Flashcard | undefined> {
    return this.loadAll().find((card) => card.id === id);
  }

  async save(card: Flashcard): Promise<void> {
    await this.saveMany([card]);
  }

  async saveMany(cardsToSave: Flashcard[]): Promise<void> {
    const cards = this.loadAll();

    for (const card of cardsToSave) {
      const existingIndex = cards.findIndex(
        (existing) => existing.id === card.id,
      );

      if (existingIndex >= 0) {
        cards[existingIndex] = card;
      } else {
        cards.push(card);
      }
    }

    this.saveAll(cards);
  }

  private loadAll(): Flashcard[] {
    const rawCards = localStorage.getItem(STORAGE_KEY);

    if (!rawCards) {
      const seedCards = this.seedCards();
      this.saveAll(seedCards);
      return seedCards;
    }

    try {
      const cards: unknown = JSON.parse(rawCards);

      if (!Array.isArray(cards)) {
        throw new Error('Stored cards are not an array.');
      }

      const filteredCards = (cards as Flashcard[]).filter(
        (card) =>
          !card.id.startsWith('dialogue-') &&
          !card.sourceText.trim().endsWith('?') &&
          !RETIRED_CARD_IDS.has(card.id),
      );
      const flashcards = this.mergeRetiredDuplicates(filteredCards);
      const seedTopics = new Map(
        this.seedCards().map((card) => [card.id, card.topicId]),
      );
      const cardsWithLevels = flashcards.map((card) => {
        const inferredCard = this.withInferredLevel(card);
        const seedTopic = seedTopics.get(card.id);

        return seedTopic && inferredCard.topicId !== seedTopic
          ? { ...inferredCard, topicId: seedTopic }
          : inferredCard;
      });
      const mergedCards = this.withMissingSeedCards(cardsWithLevels);

      if (
        flashcards.length !== (cards as Flashcard[]).length ||
        flashcards.some((card, index) => card !== filteredCards[index]) ||
        cardsWithLevels.some((card, index) => card !== flashcards[index]) ||
        mergedCards.length !== cardsWithLevels.length
      ) {
        this.saveAll(mergedCards);
      }

      return mergedCards;
    } catch {
      const seedCards = this.seedCards();
      this.saveAll(seedCards);
      return seedCards;
    }
  }

  private saveAll(cards: Flashcard[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  private mergeRetiredDuplicates(cards: Flashcard[]): Flashcard[] {
    const seeds = new Map(this.seedCards().map((card) => [card.id, card]));
    const result = new Map(
      cards.filter((card) => !SEED_CARD_REDIRECTS[card.id]).map((card) => [card.id, card]),
    );

    for (const retired of cards) {
      const id = SEED_CARD_REDIRECTS[retired.id];
      if (!id) continue;
      const seed = seeds.get(id);
      if (!seed) continue;
      const existing = result.get(id);
      // Use the most recently reviewed schedule; never reset progress to a new seed.
      const reviewedAt = (card: Flashcard): number =>
        Date.parse(card.lastReviewedAt ?? '') ||
        (card.repetition || card.reviewCount ? Date.parse(card.updatedAt) || 0 : 0);
      const progress = existing && reviewedAt(existing) >= reviewedAt(retired)
        ? existing : retired;
      result.set(id, {
        ...progress,
        id,
        level: seed.level,
        topicId: seed.topicId,
        sourceText: seed.sourceText,
        targetText: seed.targetText,
        acceptedAnswers: seed.acceptedAnswers,
        focused: Boolean(existing?.focused || retired.focused),
        focusStreak: progress.focusStreak ?? 0,
        reviewCount: Math.max(existing?.reviewCount ?? 0, retired.reviewCount ?? 0),
        lapseCount: Math.max(existing?.lapseCount ?? 0, retired.lapseCount ?? 0),
        hardCount: Math.max(existing?.hardCount ?? 0, retired.hardCount ?? 0),
        createdAt: existing && existing.createdAt < retired.createdAt
          ? existing.createdAt : retired.createdAt,
      });
    }
    return [...result.values()];
  }

  private withInferredLevel(card: Flashcard): Flashcard {
    if (card.level) {
      return card;
    }

    const level = this.levelFromCardId(card.id);

    return level ? { ...card, level } : card;
  }

  private withMissingSeedCards(cards: Flashcard[]): Flashcard[] {
    const existingIds = new Set(cards.map((card) => card.id));
    const missingSeedCards = this.seedCards().filter(
      (card) => !existingIds.has(card.id),
    );

    return missingSeedCards.length > 0 ? [...cards, ...missingSeedCards] : cards;
  }

  private levelFromCardId(cardId: string): CardLevel | undefined {
    const prefix = cardId.slice(0, 2).toUpperCase();

    if (prefix === 'A1' || prefix === 'A2' || prefix === 'B1') {
      return prefix;
    }

    return undefined;
  }

  private seedCards(): Flashcard[] {
    const now = new Date().toISOString();
    const baseCard = {
      sourceLanguage: EN_NL_SOURCE_LANGUAGE,
      targetLanguage: EN_NL_TARGET_LANGUAGE,
      status: 'new' as const,
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    };

    return getEnNlSeedCards().map((card) => ({
      ...baseCard,
      ...card,
      acceptedAnswers: card.acceptedAnswers
        ? [...card.acceptedAnswers]
        : undefined,
    }));
  }
}
