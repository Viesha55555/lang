import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  PracticeDeck,
  StudySessionService,
} from '../../core/domain/services/study-session.service';
import { MicButtonComponent } from './mic-button.component';
import { StudyCardComponent } from './study-card.component';
import { StudyResultComponent } from './study-result.component';

@Component({
  selector: 'app-study-page',
  imports: [MicButtonComponent, StudyCardComponent, StudyResultComponent],
  templateUrl: './study-page.component.html',
  styleUrl: './study-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyPageComponent {
  readonly session = inject(StudySessionService);
  readonly menuCards: readonly { title: string; deck: PracticeDeck }[] = [
    { title: 'a1', deck: 'A1' },
    { title: 'a2', deck: 'A2' },
    { title: 'b1', deck: 'B1' },
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

  onMenuCardPressed(deck: PracticeDeck): void {
    void this.session.startPractice(deck);
  }

  onDebugWritingPressed(): void {
    void this.session.startDebugWriting();
  }

  onUseSessionWordsPressed(): void {
    this.session.startWritingFromSession();
  }

  onWritingTextInput(event: Event): void {
    this.session.writingText.set((event.target as HTMLTextAreaElement).value);
  }

  onCorrectedPracticeTextInput(event: Event): void {
    this.session.correctedPracticeText.set(
      (event.target as HTMLTextAreaElement).value,
    );
  }

  onCheckWritingPressed(): void {
    void this.session.checkWriting();
  }

  onWritingMicPressed(): void {
    if (this.session.isListening()) {
      this.session.stopListening();
      return;
    }

    void this.session.answerCorrectedWriting();
  }

  writingSpeechScorePercent(): number {
    return Math.round((this.session.writingSpeechResult()?.score ?? 0) * 100);
  }

  onFinishWritingPressed(): void {
    this.session.exitPractice();
  }

  onExitWritingPressed(): void {
    this.session.exitWriting();
  }

  onBackPressed(): void {
    if (this.session.isWritingMode()) {
      this.session.exitWriting();
      return;
    }

    this.session.exitPractice();
  }
}
