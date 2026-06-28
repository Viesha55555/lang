import { Flashcard } from '../models/flashcard.model';
import { ReviewGrade } from '../models/review-result.model';

export interface ReviewSchedulerPort {
  schedule(card: Flashcard, grade: ReviewGrade, reviewedAt: Date): Flashcard;
}
