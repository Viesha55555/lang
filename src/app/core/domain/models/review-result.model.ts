export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewResult {
  cardId: string;
  spokenText: string;
  expectedText: string;
  score: number;
  passed: boolean;
  grade: ReviewGrade;
  reviewedAt: string;
}
