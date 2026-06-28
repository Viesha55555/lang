import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

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
    { title: 'Practice week words', deck: 'WEEK_WORDS' },
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

  onMenuCardPressed(deck: PracticeDeck): void {
    void this.session.startPractice(deck);
  }

  onBackPressed(): void {
    this.session.exitPractice();
  }
}
