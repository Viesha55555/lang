import { computed, inject, Injectable, signal } from '@angular/core';

import { CardLevel, Flashcard } from '../models/flashcard.model';
import { ReviewGrade, ReviewResult } from '../models/review-result.model';
import {
  ANSWER_FEEDBACK,
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SPEECH_RECOGNIZER,
} from '../tokens';

export type PracticeDeck = CardLevel | 'WEAK_WORDS';

const SESSION_CARD_LIMIT = 12;
const MAX_NEW_CARDS_PER_LEVEL_SESSION = 6;
const WEAK_CARD_LIMIT = 12;

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private readonly cards = inject(CARD_REPOSITORY);
  private readonly speech = inject(SPEECH_RECOGNIZER);
  private readonly evaluator = inject(PRONUNCIATION_EVALUATOR);
  private readonly scheduler = inject(REVIEW_SCHEDULER);
  private readonly answerFeedback = inject(ANSWER_FEEDBACK);
  private readonly sessionQueue = signal<Flashcard[]>([]);
  private readonly sessionTotal = signal(0);

  readonly currentCard = signal<Flashcard | null>(null);
  readonly practiceDeck = signal<PracticeDeck | null>(null);
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
  readonly completedCount = computed(() => {
    const currentCardOffset = this.currentCard() ? 1 : 0;

    return Math.max(
      0,
      this.sessionTotal() - this.sessionQueue().length - currentCardOffset,
    );
  });
  readonly progressLabel = computed(() => {
    const total = this.sessionTotal();

    if (total === 0) {
      return null;
    }

    const currentPosition = Math.min(this.completedCount() + 1, total);

    return `${currentPosition} / ${total}`;
  });
  readonly isSessionComplete = computed(
    () =>
      this.practiceDeck() !== null &&
      !this.isLoading() &&
      this.currentCard() === null &&
      this.sessionTotal() > 0,
  );

  async startPractice(deck: PracticeDeck): Promise<void> {
    this.practiceDeck.set(deck);
    this.currentCard.set(null);
    this.lastResult.set(null);
    this.error.set(null);
    this.sessionQueue.set([]);
    this.sessionTotal.set(0);
    this.isLoading.set(true);

    try {
      const sessionCards = await this.buildSessionCards(deck);

      this.sessionQueue.set(sessionCards);
      this.sessionTotal.set(sessionCards.length);
      this.advanceSessionQueue();
    } catch (error: unknown) {
      this.currentCard.set(null);
      this.error.set(this.messageFor(error, 'Could not load your cards.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  exitPractice(): void {
    this.speech.stop();
    this.practiceDeck.set(null);
    this.currentCard.set(null);
    this.sessionQueue.set([]);
    this.sessionTotal.set(0);
    this.lastResult.set(null);
    this.error.set(null);
    this.isListening.set(false);
    this.isLoading.set(false);
  }

  async loadNextCard(): Promise<void> {
    this.error.set(null);
    this.lastResult.set(null);
    this.advanceSessionQueue();
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

      if (reviewResult.passed) {
        void this.answerFeedback.playCorrect().catch(() => undefined);
      }
    } catch (error: unknown) {
      this.error.set(this.messageFor(error, 'Speech recognition failed.'));
    } finally {
      this.isListening.set(false);
    }
  }

  stopListening(): void {
    this.speech.stop();
  }

  private async buildSessionCards(deck: PracticeDeck): Promise<Flashcard[]> {
    const now = new Date();

    if (deck === 'WEAK_WORDS') {
      const cards = await this.cards.getAllCards();

      return cards
        .filter((card) => this.isReviewed(card))
        .sort(
          (first, second) =>
            this.weaknessScore(second, now) - this.weaknessScore(first, now),
        )
        .slice(0, WEAK_CARD_LIMIT);
    }

    const dueCards = await this.cards.getDueCards(now, 500);
    const levelCards = dueCards.filter((card) => card.level === deck);
    const newCards = levelCards
      .filter((card) => card.status === 'new')
      .slice(0, MAX_NEW_CARDS_PER_LEVEL_SESSION);
    const reviewCards = levelCards
      .filter((card) => card.status !== 'new')
      .slice(0, SESSION_CARD_LIMIT - newCards.length);

    return [...reviewCards, ...newCards].slice(0, SESSION_CARD_LIMIT);
  }

  private advanceSessionQueue(): void {
    const [nextCard, ...remainingCards] = this.sessionQueue();

    this.sessionQueue.set(remainingCards);
    this.currentCard.set(nextCard ?? null);
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

  private isReviewed(card: Flashcard): boolean {
    return Boolean(card.lastReviewedAt || card.reviewCount || card.repetition);
  }

  private weaknessScore(card: Flashcard, now: Date): number {
    const dueAt = new Date(card.dueAt).getTime();
    const overdueDays = Math.max(0, now.getTime() - dueAt) / 86_400_000;
    const lapseWeight = (card.lapseCount ?? 0) * 6;
    const hardWeight = (card.hardCount ?? 0) * 3;
    const lowEaseWeight = Math.max(0, 2.5 - card.easeFactor) * 4;
    const learningWeight = card.status === 'learning' ? 4 : 0;

    return (
      lapseWeight +
      hardWeight +
      lowEaseWeight +
      learningWeight +
      overdueDays
    );
  }

  private messageFor(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
