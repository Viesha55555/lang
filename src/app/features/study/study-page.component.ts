import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  PracticeDeck,
  StudySessionService,
} from '../../core/domain/services/study-session.service';
import { CardLevel } from '../../core/domain/models/flashcard.model';
import { TopicId } from '../../core/domain/models/learning-topic.model';
import { JourneyService } from '../../core/domain/services/journey.service';
import { ReminderService } from '../../core/domain/services/reminder.service';
import { MicButtonComponent } from './mic-button.component';
import { StudyCardComponent } from './study-card.component';
import { StudyResultComponent } from './study-result.component';

@Component({
  selector: 'app-study-page',
  imports: [MicButtonComponent, StudyCardComponent, StudyResultComponent, RouterLink],
  templateUrl: './study-page.component.html',
  styleUrl: './study-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyPageComponent implements OnDestroy {
  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    this.session.exitPractice();
    this.session.selectedLevel.set(null);
    this.session.selectedTopicId.set(null);
    const practice = params.get('practice');
    if (practice === 'focus') void this.session.startPractice('FOCUS_WORDS');
    if (practice === 'focus-extra') void this.session.startPractice('FOCUS_EXTRA');
    if (practice === 'review') void this.session.startPractice('REVIEW_WORDS');
    if (practice === 'weak') void this.session.startPractice('WEAK_WORDS');
    if (practice === 'free') void this.session.startPractice('FREE_PRACTICE');
    const topic = this.session.topics.find(t => t.id === params.get('topic'));
    if (topic) {
      this.session.selectLevel('A2');
      this.session.selectTopic(topic.id);
      if (params.get('activity') === 'dialogue' && topic.dialogueByLevel.A2.length) this.session.startDialogueAfterFlashcards();
      else void this.session.startPractice('FREE_PRACTICE');
      if (params.get('journey') === 'true') this.journey.active = {topic: topic.id, phase: params.get('activity') === 'dialogue' ? 3 : 1};
    }
  }

  ngOnDestroy(): void { this.session.exitPractice(); }

  keepPractising(): void {
    const deck = this.session.practiceDeck();
    void this.session.startPractice(deck === 'FOCUS_WORDS' || deck === 'FOCUS_EXTRA' ? 'FOCUS_EXTRA' : deck === 'REVIEW_WORDS' || deck === 'WEAK_WORDS' ? 'REVIEW_WORDS' : 'FREE_PRACTICE');
  }

  readonly journey = inject(JourneyService);
  readonly session = inject(StudySessionService);
  readonly reminders = inject(ReminderService);
  readonly reminderEnabled = signal(
    'Notification' in window && Notification.permission === 'granted',
  );
  readonly menuCards: readonly {
    title: string;
    subtitle?: string;
    level?: CardLevel;
    deck?: PracticeDeck;
  }[] = [
    { title: 'Practise focus words', subtitle: 'Your selected words, when due', deck: 'FOCUS_WORDS' },
    { title: 'Beginner', subtitle: 'A1 · simple words and phrases', level: 'A1' },
    { title: 'Elementary', subtitle: 'A2 · daily conversations', level: 'A2' },
    { title: 'Intermediate', subtitle: 'B1 · explain problems', level: 'B1' },
    { title: 'Weak words', deck: 'WEAK_WORDS' },
  ];

  startConversation(topicId: TopicId): void {
    this.session.selectTopic(topicId);
    this.session.startDialogueAfterFlashcards();
  }

  onPastTensePressed(): void {
    this.session.selectLevel('A2');
    void this.onTopicPressed('past-tense');
  }

  onMicPressed(): void {
    if (this.session.isListening()) {
      this.session.stopListening();
      return;
    }

    void this.session.answerCurrentCard();
  }

  onNextPressed(): void {
    void this.session.loadNextCard();
  }

  onContinuePressed(): void {
    this.session.continueIntro();
  }

  onReplayCardPressed(): void {
    this.session.replayCurrentCard();
  }

  onMenuCardPressed(menuCard: {
    readonly level?: CardLevel;
    readonly deck?: PracticeDeck;
  }): void {
    if (menuCard.level) {
      this.session.selectLevel(menuCard.level);
      return;
    }

    if (menuCard.deck) {
      void this.session.startPractice(menuCard.deck);
    }
  }

  async onTopicPressed(topicId: TopicId): Promise<void> {
    this.session.selectTopic(topicId);
    await this.session.startTopicFlashcards();
  }

  onDialogueMicPressed(): void {
    if (this.session.isListening()) {
      this.session.stopListening();
      return;
    }

    void this.session.answerDialogueTurn();
  }

  onSpeakingChallengeMicPressed(): void {
    if (this.session.isListening()) {
      this.session.stopListening();
      return;
    }

    void this.session.answerSpeakingChallenge();
  }

  onReplaySpeakingChallengePressed(): void {
    this.session.replaySpeakingChallenge();
  }

  onContinueAfterSpeakingChallengePressed(): void {
    this.session.continueAfterSpeakingChallenge();
  }

  onRetrySpeakingChallengePressed(): void {
    this.session.retrySpeakingChallenge();
  }

  onNextDialoguePressed(): void {
    this.session.nextDialogueTurn();
  }

  onReplayDialoguePressed(): void {
    this.session.replayDialogueLine();
  }

  onToggleDialogueTranscriptPressed(): void {
    this.session.toggleDialogueTranscript();
  }

  onToggleDialogueTranslationPressed(): void {
    this.session.toggleDialogueTranslation();
  }

  onShowDialogueAnswerPressed(): void {
    this.session.revealDialogueAnswer();
  }

  onRetryDialoguePressed(): void {
    this.session.retryDialogueTurn();
  }

  onBackPressed(): void {
    this.session.goBack();
  }

  onFreePracticePressed(): void {
    void this.session.startFreePractice();
  }

  async onEnableRemindersPressed(): Promise<void> {
    const granted = await this.reminders.requestPermission();
    this.reminderEnabled.set(granted);
  }
}
