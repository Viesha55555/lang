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
          Score {{ scorePercent() }}%
        </p>
        <dl class="speech-diagnostics">
          <div>
            <dt>Heard</dt>
            <dd>{{ result().spokenText || 'Nothing detected' }}</dd>
          </div>
          <div>
            <dt>Expected</dt>
            <dd>{{ result().expectedText }}</dd>
          </div>
          @if (showNormalized()) {
            <div>
              <dt>Compared</dt>
              <dd>
                {{ result().normalizedSpokenText || 'empty' }}
                /
                {{ result().normalizedExpectedText }}
              </dd>
            </div>
          }
        </dl>
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

  scorePercent(): number {
    return Math.round(this.result().score * 100);
  }

  showNormalized(): boolean {
    const result = this.result();

    return (
      result.normalizedSpokenText !== result.spokenText.toLocaleLowerCase() ||
      result.normalizedExpectedText !== result.expectedText.toLocaleLowerCase()
    );
  }
}
