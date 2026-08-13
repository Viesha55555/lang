import type { CardLevel } from './flashcard.model';

export type TopicId =
  | 'greetings-and-politeness'
  | 'personal-information'
  | 'basic-communication'
  | 'family-and-people'
  | 'common-adjectives'
  | 'daily-routine'
  | 'food-and-drink'
  | 'shopping-and-paying'
  | 'home-and-household'
  | 'travel-and-directions'
  | 'places-in-town'
  | 'work-and-learning'
  | 'health-and-body'
  | 'weather-and-clothes'
  | 'hobbies-and-free-time'
  | 'diy-and-renovation'
  | 'talking-about-yesterday'
  | 'animals-and-nature'
  | 'birthdays-and-celebrations'
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
