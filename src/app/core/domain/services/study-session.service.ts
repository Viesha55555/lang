import { computed, inject, Injectable, signal } from '@angular/core';

import { Flashcard } from '../models/flashcard.model';
import { ReviewGrade, ReviewResult } from '../models/review-result.model';
import {
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SPEECH_RECOGNIZER,
} from '../tokens';

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private readonly cards = inject(CARD_REPOSITORY);
  private readonly speech = inject(SPEECH_RECOGNIZER);
  private readonly evaluator = inject(PRONUNCIATION_EVALUATOR);
  private readonly scheduler = inject(REVIEW_SCHEDULER);

  readonly currentCard = signal<Flashcard | null>(null);
  readonly lastResult = signal<ReviewResult | null>(null);
  readonly isListening = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canAnswer = computed(
    () =>
      this.currentCard() !== null &&
      this.lastResult() === null &&
      !this.isListening() &&
      !this.isLoading(),
  );

  async loadNextCard(): Promise<void> {
    this.error.set(null);
    this.lastResult.set(null);
    this.isLoading.set(true);

    try {
      const dueCards = await this.cards.getDueCards(new Date(), 1);
      this.currentCard.set(dueCards[0] ?? null);
    } catch (error: unknown) {
      this.currentCard.set(null);
      this.error.set(this.messageFor(error, 'Could not load your cards.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async answerCurrentCard(): Promise<void> {
    const card = this.currentCard();

    if (!card || !this.canAnswer()) {
      return;
    }

    this.error.set(null);
    this.isListening.set(true);

    try {
      const speechResult = await this.speech.listen({
        language: card.targetLanguage,
        silenceTimeoutMs: 2_000,
        maxDurationMs: 10_000,
      });
      const evaluation = this.evaluator.evaluate(
        card.targetText,
        speechResult.transcript,
        card.acceptedAnswers,
      );
      const grade = this.gradeFromScore(evaluation.score);
      const reviewedAt = new Date();
      const reviewResult: ReviewResult = {
        cardId: card.id,
        spokenText: speechResult.transcript,
        expectedText: card.targetText,
        score: evaluation.score,
        passed: evaluation.passed,
        grade,
        reviewedAt: reviewedAt.toISOString(),
      };
      const updatedCard = this.scheduler.schedule(card, grade, reviewedAt);

      await this.cards.save(updatedCard);
      this.lastResult.set(reviewResult);
      this.currentCard.set(updatedCard);
    } catch (error: unknown) {
      this.error.set(this.messageFor(error, 'Speech recognition failed.'));
    } finally {
      this.isListening.set(false);
    }
  }

  stopListening(): void {
    this.speech.stop();
  }

  private gradeFromScore(score: number): ReviewGrade {
    if (score < 0.6) {
      return 'again';
    }

    if (score < 0.8) {
      return 'hard';
    }

    if (score < 0.95) {
      return 'good';
    }

    return 'easy';
  }

  private messageFor(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
