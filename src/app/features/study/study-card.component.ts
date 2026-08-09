import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CardLevel, Flashcard } from '../../core/domain/models/flashcard.model';

@Component({
  selector: 'app-study-card',
  template: `
    <article
      class="word-card"
      [class.revealed]="revealed()"
      [class.incorrect]="revealed() && answerPassed() === false"
      [attr.aria-label]="
        revealed()
          ? 'Answer: ' + card().targetText
          : 'Translate: ' + card().sourceText
      "
    >
      <div class="card-inner">
        <div class="card-face card-front" [attr.aria-hidden]="revealed()">
          @if (cardLevel(); as level) {
            <span class="level-badge">{{ level }}</span>
          }
          <p class="eyebrow">Translate and say aloud</p>
          <h1>{{ card().sourceText }}</h1>
          <p class="language-pair">
            {{ languageName(card().sourceLanguage) }}
            <span aria-hidden="true">→</span>
            {{ languageName(card().targetLanguage) }}
          </p>
        </div>

        <div class="card-face card-back" [attr.aria-hidden]="!revealed()">
          @if (cardLevel(); as level) {
            <span class="level-badge">{{ level }}</span>
          }
          <p class="eyebrow">Answer</p>
          <h1>{{ card().targetText }}</h1>
          <p class="language-pair">
            {{ languageName(card().targetLanguage) }}
          </p>
          @if (revealed()) {
            <button
              type="button"
              class="replay-answer"
              aria-label="Play Dutch answer again"
              title="Play Dutch answer again"
              (click)="replayRequested.emit()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
              </svg>
            </button>
          }
        </div>
      </div>
    </article>
  `,
  styleUrl: './study-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyCardComponent {
  readonly card = input.required<Flashcard>();
  readonly revealed = input(false);
  readonly answerPassed = input<boolean | null>(null);
  readonly replayRequested = output<void>();

  cardLevel(): CardLevel | undefined {
    const card = this.card();

    if (card.level) {
      return card.level;
    }

    const prefix = card.id.slice(0, 2).toUpperCase();

    if (prefix === 'A1' || prefix === 'A2' || prefix === 'B1') {
      return prefix;
    }

    return undefined;
  }

  languageName(locale: string): string {
    try {
      return (
        new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale
      );
    } catch {
      return locale;
    }
  }
}
