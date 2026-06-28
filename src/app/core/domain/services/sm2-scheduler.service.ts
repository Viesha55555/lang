import { Injectable } from '@angular/core';

import { Flashcard } from '../models/flashcard.model';
import { ReviewGrade } from '../models/review-result.model';
import { ReviewSchedulerPort } from '../ports/review-scheduler.port';

@Injectable({ providedIn: 'root' })
export class Sm2SchedulerService implements ReviewSchedulerPort {
  schedule(card: Flashcard, grade: ReviewGrade, reviewedAt: Date): Flashcard {
    const next: Flashcard = { ...card };
    const reviewedAtIso = reviewedAt.toISOString();

    next.lastReviewedAt = reviewedAtIso;
    next.updatedAt = reviewedAtIso;

    switch (grade) {
      case 'again':
        next.status = 'learning';
        next.repetition = 0;
        next.intervalDays = 0;
        next.easeFactor = Math.max(1.3, next.easeFactor - 0.2);
        next.dueAt = this.addMinutes(reviewedAt, 10).toISOString();
        break;
      case 'hard':
        next.status = 'review';
        next.repetition += 1;
        next.intervalDays = Math.max(1, Math.ceil(next.intervalDays * 1.2));
        next.easeFactor = Math.max(1.3, next.easeFactor - 0.15);
        next.dueAt = this.addDays(reviewedAt, next.intervalDays).toISOString();
        break;
      case 'good':
        next.status = 'review';
        next.repetition += 1;

        if (next.repetition === 1) {
          next.intervalDays = 1;
        } else if (next.repetition === 2) {
          next.intervalDays = 3;
        } else {
          next.intervalDays = Math.ceil(next.intervalDays * next.easeFactor);
        }

        next.dueAt = this.addDays(reviewedAt, next.intervalDays).toISOString();
        break;
      case 'easy':
        next.status = 'review';
        next.repetition += 1;
        next.easeFactor += 0.15;
        next.intervalDays =
          next.repetition === 1
            ? 4
            : Math.max(
                4,
                Math.ceil(next.intervalDays * next.easeFactor * 1.3),
              );
        next.dueAt = this.addDays(reviewedAt, next.intervalDays).toISOString();
        break;
    }

    return next;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000);
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }
}
