import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CARD_REPOSITORY } from '../../core/domain/tokens';
import { Flashcard } from '../../core/domain/models/flashcard.model';

type SortKey = 'strength' | 'dutch' | 'level' | 'due';

@Component({
  selector: 'app-dictionary-page',
  imports: [RouterLink],
  template: `
    <main class="dict-shell">
      <header class="dict-header">
        <div class="dict-title-row">
          <a routerLink="/" class="back-link" aria-label="Back to practice">←</a>
          <h1>Dictionary</h1>
          <span class="count-badge">{{ cards().length }} words</span>
        </div>

        <div class="dict-controls">
          <input
            class="search-input"
            type="search"
            placeholder="Search Dutch or English…"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            aria-label="Search cards"
          />
          <div class="sort-pills" role="group" aria-label="Sort by">
            @for (opt of sortOptions; track opt.key) {
              <button
                type="button"
                class="sort-pill"
                [class.active]="sortKey() === opt.key"
                (click)="sortKey.set(opt.key)"
              >{{ opt.label }}</button>
            }
          </div>
        </div>
      </header>

      <section class="dict-list" aria-label="Cards">
        @if (isLoading()) {
          <div class="empty-state">
            <div class="loader" aria-hidden="true"></div>
            <p>Loading…</p>
          </div>
        } @else if (filtered().length === 0) {
          <div class="empty-state">
            <p>No cards match "{{ query() }}".</p>
          </div>
        } @else {
          <table class="card-table">
            <thead>
              <tr>
                <th scope="col">Dutch</th>
                <th scope="col">English</th>
                <th scope="col">Level</th>
                <th scope="col">Status</th>
                <th scope="col">Strength</th>
              </tr>
            </thead>
            <tbody>
              @for (card of filtered(); track card.id) {
                <tr [class]="'status-' + card.status">
                  <td class="dutch-cell">{{ card.targetText }}</td>
                  <td class="english-cell">{{ card.sourceText }}</td>
                  <td class="level-cell">
                    @if (card.level) {
                      <span class="level-badge level-{{ card.level }}">{{ card.level }}</span>
                    }
                  </td>
                  <td class="status-cell">
                    <span class="status-pill">{{ card.status }}</span>
                  </td>
                  <td class="strength-cell">
                    <div class="strength-bar-wrap" [title]="strengthLabel(card) + ' — ease ' + card.easeFactor.toFixed(2)">
                      <div
                        class="strength-bar"
                        [class]="'strength-' + strengthTier(card)"
                        [style.width.%]="strengthPct(card)"
                      ></div>
                    </div>
                    <span class="strength-label">{{ strengthLabel(card) }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
  styleUrl: './dictionary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DictionaryPageComponent implements OnInit {
  private readonly repo = inject(CARD_REPOSITORY);

  readonly cards = signal<Flashcard[]>([]);
  readonly isLoading = signal(true);
  readonly query = signal('');
  readonly sortKey = signal<SortKey>('strength');

  readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'strength', label: 'Strength' },
    { key: 'dutch', label: 'Dutch' },
    { key: 'level', label: 'Level' },
    { key: 'due', label: 'Due' },
  ];

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.cards();
    const sort = this.sortKey();

    const matched = q
      ? all.filter(
          (c) =>
            c.targetText.toLowerCase().includes(q) ||
            c.sourceText.toLowerCase().includes(q),
        )
      : all;

    return [...matched].sort((a, b) => {
      switch (sort) {
        case 'strength':
          return this.strengthPct(a) - this.strengthPct(b);
        case 'dutch':
          return a.targetText.localeCompare(b.targetText, 'nl');
        case 'level': {
          const levelOrder = { A1: 0, A2: 1, B1: 2, undefined: 3 };
          const la = levelOrder[a.level ?? 'undefined'] ?? 3;
          const lb = levelOrder[b.level ?? 'undefined'] ?? 3;
          return la - lb || a.targetText.localeCompare(b.targetText, 'nl');
        }
        case 'due':
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
    });
  });

  async ngOnInit(): Promise<void> {
    const all = await this.repo.getAllCards();
    this.cards.set(all);
    this.isLoading.set(false);
  }

  strengthPct(card: Flashcard): number {
    if (card.status === 'new') {
      return 0;
    }

    // easeFactor ranges from ~1.3 (very hard) to 2.5+ (easy).
    // Map it to 0–100 with lapses dragging it down.
    const easeScore = Math.min(100, Math.max(0, ((card.easeFactor - 1.3) / 1.2) * 100));
    const lapsePenalty = Math.min(50, (card.lapseCount ?? 0) * 10);

    return Math.max(0, Math.round(easeScore - lapsePenalty));
  }

  strengthTier(card: Flashcard): 'none' | 'low' | 'mid' | 'high' {
    const pct = this.strengthPct(card);

    if (pct === 0) return 'none';
    if (pct < 40) return 'low';
    if (pct < 72) return 'mid';
    return 'high';
  }

  strengthLabel(card: Flashcard): string {
    if (card.status === 'new') return 'New';

    const pct = this.strengthPct(card);

    if (pct < 25) return 'Weak';
    if (pct < 55) return 'OK';
    if (pct < 80) return 'Good';
    return 'Strong';
  }
}
