import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';

import { StudySessionService } from '../../core/domain/services/study-session.service';
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
export class StudyPageComponent implements OnInit {
  readonly session = inject(StudySessionService);

  ngOnInit(): void {
    void this.session.loadNextCard();
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
}
