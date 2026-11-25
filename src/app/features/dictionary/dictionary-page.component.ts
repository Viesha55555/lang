import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CARD_REPOSITORY } from '../../core/domain/tokens';
import { findLearningTopic } from '../../core/domain/models/learning-topics';
import { ReminderService } from '../../core/domain/services/reminder.service';
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
          <h1>{{ isReview ? 'Your review' : 'Focus words' }}</h1>
          <span class="count-badge">{{ filtered().length }} words</span>
        </div>

        <p>{{ isReview ? 'The words you have met. Revisit them whenever you like.' : 'Your words, your priorities. Keep a small set close.' }}</p>
        <div class="focus-actions">
          <a class="primary-action" routerLink="/learn" [queryParams]="{practice: isReview ? 'review' : 'focus'}">{{ isReview ? 'Review words' : 'Practise due focus words' }} →</a>
          @if (!isReview) {
            <a routerLink="/learn" [queryParams]="{practice: 'focus-extra'}">Practise anytime</a>
            <button (click)="onlyFocused.set(!onlyFocused())" [attr.aria-pressed]="onlyFocused()">{{ onlyFocused() ? 'Add words to focus' : 'Show my focus set' }}</button>
          } @else { <a routerLink="/learn" [queryParams]="{practice: 'weak'}">Practise difficult words</a> }
        </div>
        @if (!isReview) {
          <details class="focus-help"><summary>{{ focusedCount() }} selected · Tips & reminders</summary><p>Aim for around 15 words. After 3 successful reviews, a word enters maintenance and stays in your set.</p>
            @if (reminders.isSupported) { <button (click)="enableReminders()">Enable reminders</button><p role="status">{{ reminderMessage() }}</p><p>Delivery depends on browser support and permission.</p> }
          </details>
        }
        @if (error()) { <p role="alert">{{ error() }}</p> }
        <div class="dict-controls">
          <label>Category
            <select [value]="category()" (change)="category.set($any($event.target).value)">
              <option value="">All categories</option>
              @for (name of categories(); track name) { <option [value]="name">{{ name }}</option> }
            </select>
          </label>
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
            <p>{{ query() ? 'No words match your search.' : isReview ? 'Your practised words will appear here after your first session.' : 'No words in this set yet. Add a few favourites to get started.' }}</p>
          </div>
        } @else {
          <div class="word-list">
            @for (card of filtered(); track card.id) {
              <article class="word-row">
                <div class="word-copy"><strong>{{ card.targetText }}</strong><span>{{ card.sourceText }}</span><small>{{ categoryName(card) }} · {{ card.level }} @if (isReview && card.lastReviewedAt) { · Last practised {{ reviewDate(card) }} }</small></div>
                <div class="word-meta"><span class="word-status">{{ card.status === 'new' ? 'New' : (card.focusStreak ?? 0) >= 3 ? 'Maintenance' : 'Practising' }}</span><button [disabled]="saving()" [attr.aria-pressed]="!!card.focused" [attr.aria-label]="(card.focused ? 'Remove from focus: ' : 'Focus on: ') + card.targetText" (click)="toggleFocus(card)">{{ card.focused ? '★ Focused' : '☆ Focus' }}</button></div>
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
  styleUrl: './dictionary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DictionaryPageComponent implements OnInit {
  readonly isReview = inject(ActivatedRoute).snapshot.routeConfig?.path === 'review';
  reviewDate(card: Flashcard): string { return new Date(card.lastReviewedAt!).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}); }
  private readonly repo = inject(CARD_REPOSITORY);

  readonly reminders = inject(ReminderService);
  readonly reminderMessage = signal('');
  async enableReminders(): Promise<void> {
    try {
      this.reminderMessage.set(await this.reminders.requestPermission()
        ? 'Focus reminders enabled.'
        : 'Notifications are blocked or unavailable. You can still practise your focus words here.');
    } catch { this.reminderMessage.set('Could not enable notifications. Please try again.'); }
  }
  readonly error = signal('');
  readonly saving = signal(false);
  readonly onlyFocused = signal(!this.isReview);
  readonly category = signal('');
  readonly focusedCount = computed(() => this.cards().filter(c => c.focused).length);
  readonly categories = computed(() => [...new Set(this.cards().map(c => this.categoryName(c)))].sort());

  categoryName(card: Flashcard): string {
    return (card.topicId ? findLearningTopic(card.topicId)?.title : null) ?? 'Other';
  }

  async toggleFocus(card: Flashcard): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const updated = { ...card, focused: !card.focused, focusStreak: 0 };
      await this.repo.save(updated);
      this.cards.update(cards => cards.map(c => c.id === card.id ? updated : c));
      await this.reminders.scheduleNextReminder();
    } catch {
      this.error.set('Could not save your selection. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

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
    const all = this.cards().filter(c => (!this.isReview || !!c.lastReviewedAt) && (!this.onlyFocused() || c.focused) && (!this.category() || this.categoryName(c) === this.category()));
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
    try { this.cards.set(await this.repo.getAllCards()); }
    catch { this.error.set('Could not load your words. Please reload to try again.'); }
    finally { this.isLoading.set(false); }
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
