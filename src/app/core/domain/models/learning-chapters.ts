import { TopicId } from './learning-topic.model';

/** Conversation chapters and the vocabulary collections that prepare for them. */
export const CHAPTER_VOCABULARY: Partial<Record<TopicId, TopicId>> = {
  food: 'food-and-drink',
  shopping: 'shopping-and-paying',
  travel: 'travel-and-directions',
  work: 'work-and-learning',
  doctor: 'health-and-body',
  home: 'home-and-household',
  animals: 'animals-and-nature',
  'daily-life': 'daily-routine',
  'past-tense': 'past-tense',
};
