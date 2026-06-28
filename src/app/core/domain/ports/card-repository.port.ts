import { Flashcard } from '../models/flashcard.model';

export interface CardRepositoryPort {
  getDueCards(now: Date, limit: number): Promise<Flashcard[]>;
  getById(id: string): Promise<Flashcard | undefined>;
  save(card: Flashcard): Promise<void>;
  saveMany(cards: Flashcard[]): Promise<void>;
}
