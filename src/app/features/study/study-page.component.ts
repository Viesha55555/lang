import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  PracticeDeck,
  StudySessionService,
} from '../../core/domain/services/study-session.service';
import { CardLevel } from '../../core/domain/models/flashcard.model';
import { TopicId } from '../../core/domain/models/learning-topic.model';
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
export class StudyPageComponent {
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
    { title: 'Beginner', subtitle: 'A1 · simple words and phrases', level: 'A1' },
    { title: 'Elementary', subtitle: 'A2 · daily conversations', level: 'A2' },
    { title: 'Intermediate', subtitle: 'B1 · explain problems', level: 'B1' },
    { title: 'Weak words', deck: 'WEAK_WORDS' },
  ];

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

  onNextDialoguePressed(): void {
    this.session.nextDialogueTurn();
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
