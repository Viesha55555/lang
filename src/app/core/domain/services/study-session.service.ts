import { computed, inject, Injectable, signal } from '@angular/core';

import { CardLevel, Flashcard } from '../models/flashcard.model';
import {
  LearningTopic,
  TopicDialogueTurn,
  TopicId,
} from '../models/learning-topic.model';
import { findLearningTopic, LEARNING_TOPICS } from '../models/learning-topics';
import { ReviewGrade, ReviewResult } from '../models/review-result.model';
import {
  ANSWER_FEEDBACK,
  CARD_REPOSITORY,
  PRONUNCIATION_EVALUATOR,
  REVIEW_SCHEDULER,
  SPEECH_RECOGNIZER,
  TEXT_TO_SPEECH,
} from '../tokens';

export type PracticeDeck = CardLevel | 'WEAK_WORDS';
export type TopicActivity = 'DIALOGUE';

const SESSION_CARD_LIMIT = 12;
const MAX_NEW_CARDS_PER_LEVEL_SESSION = 6;
const WEAK_CARD_LIMIT = 12;
const DIALOGUE_CARD_ID_PREFIX = 'dialogue';

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private readonly cards = inject(CARD_REPOSITORY);
  private readonly speech = inject(SPEECH_RECOGNIZER);
  private readonly tts = inject(TEXT_TO_SPEECH);
  private readonly evaluator = inject(PRONUNCIATION_EVALUATOR);
  private readonly scheduler = inject(REVIEW_SCHEDULER);
  private readonly answerFeedback = inject(ANSWER_FEEDBACK);
  private readonly sessionQueue = signal<Flashcard[]>([]);
  private readonly sessionTotal = signal(0);
  private readonly sessionStartedFromTopic = signal(false);
  private readonly dialogueUserTurnIndex = signal(0);

  readonly currentCard = signal<Flashcard | null>(null);
  readonly practiceDeck = signal<PracticeDeck | null>(null);
  readonly selectedLevel = signal<CardLevel | null>(null);
  readonly selectedTopicId = signal<TopicId | null>(null);
  readonly selectedActivity = signal<TopicActivity | null>(null);
  readonly lastResult = signal<ReviewResult | null>(null);
  readonly dialogueResult = signal<ReviewResult | null>(null);
  readonly gemCount = signal(0);
  readonly isListening = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly needsIntro = signal(false);
  readonly topics = LEARNING_TOPICS;
  readonly selectedTopic = computed<LearningTopic | null>(() => {
    const topicId = this.selectedTopicId();

    return topicId ? findLearningTopic(topicId) : null;
  });
  readonly selectedTopicDialogue = computed(
    () =>
      this.selectedTopic()?.dialogueByLevel[this.selectedLevel() ?? 'A1'] ?? [],
  );
  readonly selectedTopicUserTurns = computed(() =>
    this.selectedTopicDialogue().filter((turn) => turn.speaker === 'user'),
  );
  readonly currentDialogueUserTurn = computed<TopicDialogueTurn | null>(
    () => this.selectedTopicUserTurns()[this.dialogueUserTurnIndex()] ?? null,
  );
  readonly currentDialogueQuestion = computed<TopicDialogueTurn | null>(() => {
    const dialogue = this.selectedTopicDialogue();
    const currentUserTurn = this.currentDialogueUserTurn();

    if (!currentUserTurn) {
      return null;
    }

    const absoluteTurnIndex = dialogue.indexOf(currentUserTurn);

    for (let index = absoluteTurnIndex - 1; index >= 0; index -= 1) {
      const turn = dialogue[index];

      if (turn.speaker === 'app') {
        return turn;
      }
    }

    return null;
  });
  readonly dialogueProgressLabel = computed(() => {
    const total = this.selectedTopicUserTurns().length;

    if (total === 0) {
      return null;
    }

    return `${Math.min(this.dialogueUserTurnIndex() + 1, total)} / ${total}`;
  });
  readonly isDialogueComplete = computed(
    () =>
      this.selectedActivity() === 'DIALOGUE' &&
      this.currentDialogueUserTurn() === null &&
      this.selectedTopicUserTurns().length > 0,
  );
  readonly selectedTopicGoal = computed(() => {
    const topic = this.selectedTopic();
    const level = this.selectedLevel();

    return topic && level ? topic.goalByLevel[level] : null;
  });
  readonly canAnswer = computed(
    () =>
      this.currentCard() !== null &&
      this.lastResult() === null &&
      !this.needsIntro() &&
      !this.isListening() &&
      !this.isLoading(),
  );
  readonly canAnswerDialogue = computed(
    () =>
      this.selectedActivity() === 'DIALOGUE' &&
      this.currentDialogueUserTurn() !== null &&
      this.dialogueResult() === null &&
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

  selectLevel(level: CardLevel): void {
    this.selectedLevel.set(level);
    this.selectedTopicId.set(null);
    this.selectedActivity.set(null);
    this.exitPractice();
  }

  selectTopic(topicId: TopicId): void {
    this.selectedTopicId.set(topicId);
    this.selectedActivity.set(null);
    this.exitPractice();
  }

  goBack(): void {
    if (this.practiceDeck()) {
      const returnToTopicList = this.sessionStartedFromTopic();

      this.exitPractice();

      if (returnToTopicList) {
        this.selectedTopicId.set(null);
      }

      return;
    }

    if (this.selectedActivity()) {
      this.selectedActivity.set(null);
      this.dialogueUserTurnIndex.set(0);
      this.dialogueResult.set(null);
      return;
    }

    if (this.selectedTopicId()) {
      this.selectedTopicId.set(null);
      return;
    }

    if (this.selectedLevel()) {
      this.selectedLevel.set(null);
    }
  }

  async startTopicFlashcards(): Promise<void> {
    const level = this.selectedLevel();

    if (!level) {
      return;
    }

    this.sessionStartedFromTopic.set(true);
    await this.startPractice(level);
  }

  async startPractice(deck: PracticeDeck): Promise<void> {
    this.practiceDeck.set(deck);
    this.currentCard.set(null);
    this.lastResult.set(null);
    this.needsIntro.set(false);
    this.error.set(null);
    this.sessionQueue.set([]);
    this.sessionTotal.set(0);
    this.dialogueResult.set(null);
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
    this.tts.cancel();
    this.practiceDeck.set(null);
    this.currentCard.set(null);
    this.sessionQueue.set([]);
    this.sessionTotal.set(0);
    this.lastResult.set(null);
    this.needsIntro.set(false);
    this.error.set(null);
    this.isListening.set(false);
    this.isLoading.set(false);
    this.sessionStartedFromTopic.set(false);
  }

  async loadNextCard(): Promise<void> {
    this.error.set(null);
    this.lastResult.set(null);
    const shouldStartDialogue =
      this.sessionStartedFromTopic() && this.practiceDeck() !== 'WEAK_WORDS';

    this.advanceSessionQueue();

    if (shouldStartDialogue && this.isSessionComplete()) {
      this.startDialogueAfterFlashcards();
    }
  }

  continueIntro(): void {
    if (!this.currentCard() || !this.needsIntro()) {
      return;
    }

    this.error.set(null);
    this.needsIntro.set(false);
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
        normalizedSpokenText: evaluation.normalizedActual,
        normalizedExpectedText: evaluation.normalizedExpected,
        score: evaluation.score,
        passed: evaluation.passed,
        grade,
        reviewedAt: reviewedAt.toISOString(),
      };
      const updatedCard = this.scheduler.schedule(card, grade, reviewedAt);

      await this.cards.save(updatedCard);
      this.lastResult.set(reviewResult);
      this.currentCard.set(updatedCard);

      // Speak the Dutch answer aloud so the user hears the correct pronunciation.
      void this.tts
        .speak(card.targetText, { language: card.targetLanguage })
        .catch(() => undefined);

      if (reviewResult.passed) {
        this.gemCount.update((count) => count + 1);
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

  async answerDialogueTurn(): Promise<void> {
    const expectedTurn = this.currentDialogueUserTurn();

    if (!expectedTurn || !this.canAnswerDialogue()) {
      return;
    }

    this.error.set(null);
    this.isListening.set(true);

    try {
      const speechResult = await this.speech.listen({
        language: 'nl-NL',
        silenceTimeoutMs: 2_000,
        maxDurationMs: 12_000,
      });
      const evaluation = this.evaluator.evaluate(
        expectedTurn.text,
        speechResult.transcript,
      );
      const grade = this.gradeFromScore(evaluation.score);
      const reviewedAt = new Date();
      const reviewResult: ReviewResult = {
        cardId: this.dialogueCardId(),
        spokenText: speechResult.transcript,
        expectedText: expectedTurn.text,
        normalizedSpokenText: evaluation.normalizedActual,
        normalizedExpectedText: evaluation.normalizedExpected,
        score: evaluation.score,
        passed: evaluation.passed,
        grade,
        reviewedAt: reviewedAt.toISOString(),
      };

      await this.saveDialoguePhraseCard(expectedTurn, grade, reviewedAt);
      this.dialogueResult.set(reviewResult);

      if (reviewResult.passed) {
        this.gemCount.update((count) => count + 1);
        void this.answerFeedback.playCorrect().catch(() => undefined);
      }
    } catch (error: unknown) {
      this.error.set(this.messageFor(error, 'Speech recognition failed.'));
    } finally {
      this.isListening.set(false);
    }
  }

  nextDialogueTurn(): void {
    if (!this.dialogueResult()) {
      return;
    }

    this.dialogueResult.set(null);
    this.dialogueUserTurnIndex.update((index) => index + 1);

    const nextQuestion = this.currentDialogueQuestion();

    if (nextQuestion) {
      void this.tts
        .speak(nextQuestion.text, { language: 'nl-NL' })
        .catch(() => undefined);
    }
  }

  private async buildSessionCards(deck: PracticeDeck): Promise<Flashcard[]> {
    const now = new Date();

    if (deck === 'WEAK_WORDS') {
      const cards = await this.cards.getAllCards();

      return cards
        .filter((card) => this.isReviewed(card))
        .filter((card) => this.matchesCurrentSelection(card))
        .sort(
          (first, second) =>
            this.weaknessScore(second, now) - this.weaknessScore(first, now),
        )
        .slice(0, WEAK_CARD_LIMIT);
    }

    const dueCards = await this.cards.getDueCards(now, 500);
    const levelCards = dueCards
      .filter((card) => card.level === deck)
      .filter((card) => this.matchesCurrentSelection(card));
    const newCards = levelCards
      .filter((card) => card.status === 'new')
      .slice(0, MAX_NEW_CARDS_PER_LEVEL_SESSION);
    const reviewCards = levelCards
      .filter((card) => card.status !== 'new')
      .slice(0, SESSION_CARD_LIMIT - newCards.length);

    return [...reviewCards, ...newCards].slice(0, SESSION_CARD_LIMIT);
  }

  private startDialogueAfterFlashcards(): void {
    this.exitPractice();
    this.selectedActivity.set('DIALOGUE');
    this.dialogueUserTurnIndex.set(0);
    this.dialogueResult.set(null);

    const firstQuestion = this.currentDialogueQuestion();

    if (firstQuestion) {
      void this.tts
        .speak(firstQuestion.text, { language: 'nl-NL' })
        .catch(() => undefined);
    }
  }

  private matchesCurrentSelection(card: Flashcard): boolean {
    const selectedLevel = this.selectedLevel();
    const selectedTopic = this.selectedTopic();

    if (selectedLevel && card.level !== selectedLevel) {
      return false;
    }

    if (!selectedTopic) {
      return true;
    }

    return this.cardMatchesTopic(card, selectedTopic);
  }

  private cardMatchesTopic(card: Flashcard, topic: LearningTopic): boolean {
    if (card.topicId === topic.id) {
      return true;
    }

    const haystack = `${card.id} ${card.sourceText} ${card.targetText}`.toLowerCase();

    return topic.keywords.some((keyword) =>
      haystack.includes(keyword.toLowerCase()),
    );
  }

  private advanceSessionQueue(): void {
    const [nextCard, ...remainingCards] = this.sessionQueue();

    this.sessionQueue.set(remainingCards);
    this.currentCard.set(nextCard ?? null);
    this.needsIntro.set(nextCard?.status === 'new');

    // For new cards the answer is shown immediately as an intro — speak it so
    // the user hears the Dutch word before they have to say it themselves.
    if (nextCard?.status === 'new') {
      void this.tts
        .speak(nextCard.targetText, { language: nextCard.targetLanguage })
        .catch(() => undefined);
    }
  }

  private async saveDialoguePhraseCard(
    expectedTurn: TopicDialogueTurn,
    grade: ReviewGrade,
    reviewedAt: Date,
  ): Promise<void> {
    const existingCard = await this.cards.getById(this.dialogueCardId());
    const baseCard = existingCard ?? this.createDialoguePhraseCard(expectedTurn);
    const scheduledCard = this.scheduler.schedule(baseCard, grade, reviewedAt);
    const dueAt =
      grade === 'again' || grade === 'hard'
        ? reviewedAt.toISOString()
        : scheduledCard.dueAt;

    await this.cards.save({ ...scheduledCard, dueAt });
  }

  private createDialoguePhraseCard(expectedTurn: TopicDialogueTurn): Flashcard {
    const now = new Date().toISOString();

    return {
      id: this.dialogueCardId(),
      level: this.selectedLevel() ?? 'A1',
      topicId: this.selectedTopicId() ?? undefined,
      sourceText: this.currentDialogueQuestion()?.text ?? 'dialogue answer',
      targetText: expectedTurn.text,
      sourceLanguage: 'nl-NL',
      targetLanguage: 'nl-NL',
      status: 'new',
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  private dialogueCardId(): string {
    const level = this.selectedLevel()?.toLowerCase() ?? 'a1';
    const topicId = this.selectedTopicId() ?? 'topic';

    return `${DIALOGUE_CARD_ID_PREFIX}-${level}-${topicId}-${this.dialogueUserTurnIndex() + 1}`;
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
