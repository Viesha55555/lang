import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { ReviewResult } from '../../core/domain/models/review-result.model';

@Component({
  selector: 'app-study-result',
  template: `
    <section
      class="result"
      [class.passed]="result().passed"
      [class.failed]="!result().passed"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="result-mark" aria-hidden="true">
        {{ result().passed ? '✓' : '↻' }}
      </div>
      <div class="result-copy">
        <p class="result-title">
          {{ result().passed ? 'Nicely done' : 'Give it another round' }}
        </p>
        <p class="score">
          {{ result().passed ? 'Answer revealed' : 'Try this card again soon' }}
        </p>
      </div>
      <button type="button" class="next-button" (click)="next.emit()">
        Next card
        <span aria-hidden="true">→</span>
      </button>
    </section>
  `,
  styleUrl: './study-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyResultComponent {
  readonly result = input.required<ReviewResult>();
  readonly next = output<void>();
}
