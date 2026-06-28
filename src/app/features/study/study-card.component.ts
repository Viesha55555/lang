import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Flashcard } from '../../core/domain/models/flashcard.model';

@Component({
  selector: 'app-study-card',
  template: `
    <article
      class="word-card"
      [class.revealed]="revealed()"
      [attr.aria-label]="
        revealed()
          ? 'Answer: ' + card().targetText
          : 'Translate: ' + card().sourceText
      "
    >
      <div class="card-inner">
        <div class="card-face card-front" aria-hidden="true">
          <p class="eyebrow">Translate and say aloud</p>
          <h1>{{ card().sourceText }}</h1>
          <p class="language-pair">
            {{ languageName(card().sourceLanguage) }}
            <span aria-hidden="true">→</span>
            {{ languageName(card().targetLanguage) }}
          </p>
        </div>

        <div class="card-face card-back" aria-hidden="true">
          <p class="eyebrow">Answer</p>
          <h1>{{ card().targetText }}</h1>
          <p class="language-pair">
            {{ languageName(card().targetLanguage) }}
          </p>
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
