import type { CardLevel } from './flashcard.model';

export type TopicId =
  | 'daily-life'
  | 'introductions-and-communication'
  | 'family-and-relationships'
  | 'numbers'
  | 'time-and-calendar'
  | 'government-and-administration'
  | 'opinions-and-discussion'
  | 'colors'
  | 'shopping'
  | 'food'
  | 'work'
  | 'music'
  | 'travel'
  | 'doctor'
  | 'neighbors'
  | 'home'
  | 'animals'
  | 'home-renovation'
  | 'hardware-store'
  | 'appointments'
  | 'past-tense';

export interface TopicPhrase {
  readonly pattern: string;
  readonly example: string;
}

export interface TopicDialogueTurn {
  readonly speaker: 'app' | 'user';
  readonly text: string;
  /** English translation for an app line. */
  readonly translation?: string;
  /** Precise English production instruction for a learner line. */
  readonly instruction?: string;
  /** The controlled structure being practised. */
  readonly targetTemplate?: string;
}

export interface LearningTopic {
  readonly id: TopicId;
  readonly title: string;
  readonly description: string;
  readonly goalByLevel: Record<CardLevel, string>;
  readonly keywords: readonly string[];
  readonly phrasesByLevel: Record<CardLevel, readonly TopicPhrase[]>;
  readonly dialogueByLevel: Record<CardLevel, readonly TopicDialogueTurn[]>;
}
