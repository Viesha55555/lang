import type { TopicId } from './learning-topic.model';

export type CardStatus = 'new' | 'learning' | 'review';
export type CardLevel = 'A1' | 'A2' | 'B1';
export type FlashcardType = 'noun' | 'verb' | 'phrase' | 'location' | 'other';

export interface FlashcardGrammar {
  readonly article?: 'de' | 'het';
  readonly plural?: string;
  readonly countability?: 'countable' | 'uncountable';
  readonly infinitive?: string;
  readonly firstPersonPresent?: string;
  readonly pastParticiple?: string;
}

export interface Flashcard {
  id: string;
  level?: CardLevel;
  topicId?: TopicId;
  sourceText: string;
  targetText: string;
  acceptedAnswers?: string[];
  type?: FlashcardType;
  grammar?: FlashcardGrammar;
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
