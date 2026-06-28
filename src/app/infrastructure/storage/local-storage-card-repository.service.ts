import { Injectable } from '@angular/core';

import { Flashcard } from '../../core/domain/models/flashcard.model';
import { CardRepositoryPort } from '../../core/domain/ports/card-repository.port';

const STORAGE_KEY = 'spoken-flashcards.cards.v1';

@Injectable({ providedIn: 'root' })
export class LocalStorageCardRepositoryService implements CardRepositoryPort {
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

      return cards as Flashcard[];
    } catch {
      const seedCards = this.seedCards();
      this.saveAll(seedCards);
      return seedCards;
    }
  }

  private saveAll(cards: Flashcard[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  private seedCards(): Flashcard[] {
    const now = new Date().toISOString();
    const baseCard = {
      sourceLanguage: 'en-US',
      targetLanguage: 'nl-NL',
      status: 'new' as const,
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    };

    return [
      {
        ...baseCard,
        id: 'seed-apple',
        sourceText: 'apple',
        targetText: 'appel',
      },
      {
        ...baseCard,
        id: 'seed-house',
        sourceText: 'house',
        targetText: 'huis',
      },
      {
        ...baseCard,
        id: 'seed-working-today',
        sourceText: 'I am working today',
        targetText: 'Ik werk vandaag',
        acceptedAnswers: ["'k werk vandaag"],
      },
      {
        ...baseCard,
        id: 'seed-good-morning',
        sourceText: 'good morning',
        targetText: 'goedemorgen',
      },
      {
        ...baseCard,
        id: 'seed-bicycle',
        sourceText: 'bicycle',
        targetText: 'fiets',
      },
    ];
  }
}
