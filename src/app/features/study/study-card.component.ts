import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Flashcard } from '../../core/domain/models/flashcard.model';

@Component({
  selector: 'app-study-card',
  template: `
    <article class="word-card" aria-labelledby="study-prompt study-word">
      <p class="eyebrow" id="study-prompt">Translate and say aloud</p>
      <h1 id="study-word">{{ card().sourceText }}</h1>
      <p class="language-pair">
        {{ languageName(card().sourceLanguage) }}
        <span aria-hidden="true">→</span>
        {{ languageName(card().targetLanguage) }}
      </p>
    </article>
  `,
  styleUrl: './study-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyCardComponent {
  readonly card = input.required<Flashcard>();

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
