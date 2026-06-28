export type CardStatus = 'new' | 'learning' | 'review';

export interface Flashcard {
  id: string;
  sourceText: string;
  targetText: string;
  acceptedAnswers?: string[];
  sourceLanguage: string;
  targetLanguage: string;
  status: CardStatus;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}
