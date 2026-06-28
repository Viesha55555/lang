export type CardStatus = 'new' | 'learning' | 'review';
export type CardLevel = 'A1' | 'A2' | 'B1';

export interface Flashcard {
  id: string;
  level?: CardLevel;
  sourceText: string;
  targetText: string;
  acceptedAnswers?: string[];
  sourceLanguage: string;
  targetLanguage: string;
  status: CardStatus;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  reviewCount?: number;
  lapseCount?: number;
  hardCount?: number;
  dueAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
