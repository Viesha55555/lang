import { ChangeDetectionStrategy, Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CARD_REPOSITORY, TEXT_TO_SPEECH } from '../../core/domain/tokens';
import { Flashcard } from '../../core/domain/models/flashcard.model';
import { LEARNING_TOPICS } from '../../core/domain/models/learning-topics';
import { CHAPTER_VOCABULARY } from '../../core/domain/models/learning-chapters';
import { JourneyService } from '../../core/domain/services/journey.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="home-shell">
      <header class="home-header"><a routerLink="/" class="wordmark"><span>S</span> spoken</a><span class="language-badge">NL · Dutch</span></header>
      <section class="welcome"><p class="eyebrow">MAKE YOURSELF UNDERSTOOD</p><h1>Small steps.<br>Real conversations.</h1><p>Your Dutch, a little more confident every day.</p></section>
      @if (error()) { <p role="alert">{{ error() }}</p> }
      <section class="daily-card">
        <div><span class="eyebrow">YOUR NEXT SMALL STEP</span><h2>{{ loading() ? 'Getting ready…' : dueCount() ? dueCount() + ' words ready to revisit' : 'Make room for a little Dutch' }}</h2><p>{{ dueCount() ? 'Bring familiar words back to mind.' : 'Explore something new or practise what you know.' }}</p></div>
        <a class="primary-action" routerLink="/learn" [queryParams]="{practice: dueCount() ? 'review' : 'free'}">Start practice <span>→</span></a>
        <div class="daily-stats"><span><strong>{{ reviewedCount() }}</strong> words practised</span><span><strong>{{ focusCount() }}</strong> in your focus set</span></div>
      </section>
      <div class="quick-links"><a routerLink="/dictionary"><span class="quick-icon">☆</span><strong>Your focus words</strong><small>Make it personal</small><span class="arrow">↗</span></a><a routerLink="/review"><span class="quick-icon">↺</span><strong>Revisit & remember</strong><small>Keep words with you</small><span class="arrow">↗</span></a></div>
      <section class="journey-card">
        <div class="section-heading"><div><p class="eyebrow">A LITTLE DIRECTION</p><h2>Your optional journey</h2></div><span class="soft-badge">Always open</span></div>
        <p>Follow a chapter, jump ahead, or learn your own way.</p><p class="journey-note">{{ familiarCount() }} chapter words already practised. Familiar with them? Jump straight to phrases.</p>
        <label class="chapter-picker">Chapter · A2<select [value]="topicId()" (change)="changeChapter($any($event.target).value)">@for (topic of topics; track topic.id) { <option [value]="topic.id" [selected]="topic.id === topicId()">{{ topic.title }}</option> }</select></label>
        <ol class="phase-list">@for (phase of journey.phases; track phase; let i = $index) {
          <li><button [class.current]="phaseIndex() === i" [attr.aria-pressed]="phaseIndex() === i" (click)="phaseIndex.set(i)"><span class="phase-number">{{ isDone(i) ? '✓' : i + 1 }}</span><span>{{ phase }}<small>{{ isDone(i) ? 'Completed · revisit anytime' : i === 0 ? 'Get familiar' : i === 1 ? 'Say it from memory' : i === 2 ? 'Put words in context' : 'Bring it all together' }}</small></span><span class="arrow">→</span></button></li>
        }</ol>
        <div class="phase-preview">
          <p class="eyebrow">{{ journey.phases[phaseIndex()] }}</p>
          @if (phaseIndex() === 0) {
            @for (card of chapterWords(); track card.id) { <button class="preview-word" (click)="speak(card.targetText)"><span><strong>{{ card.targetText }}</strong><small>{{ card.sourceText }}</small></span><span aria-hidden="true">▷</span><span class="sr-only">Listen</span></button> }
            @if (!chapterWords().length) { <p>Explore this chapter through its useful phrases.</p> }
            <button class="primary-action" (click)="completePreview()">Ready to recall →</button>
          } @else if (phaseIndex() === 2) {
            @for (phrase of chapter().phrasesByLevel.A2; track phrase.pattern) { <button class="preview-word" (click)="speak(phrase.example)"><span><strong>{{ phrase.pattern }}</strong><small>{{ phrase.example }}</small></span><span aria-hidden="true">▷</span><span class="sr-only">Listen</span></button> }
            <p>Listen, then try saying each example aloud.</p><button class="primary-action" (click)="completePreview()">I've practised these →</button>
          } @else { <p>{{ phaseIndex() === 1 ? 'A short round of chapter vocabulary. Hints and retries are welcome.' : 'Listen and answer in a guided conversation. You can always reveal an answer.' }}</p><button class="primary-action" (click)="startPhase()">{{ phaseIndex() === 1 ? 'Practise chapter words' : 'Start conversation' }} →</button> }
        </div>
        <p class="journey-note">{{ journey.completed()[topicId()]?.length ?? 0 }} of 4 activities completed · word confidence grows through review.</p>
        @if (journey.storageError()) { <p role="status">{{ journey.storageError() }}</p> }
      </section>
      <a class="browse-link" routerLink="/learn">Browse all topics and levels <span>→</span></a>
    </main>`,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  private readonly repo = inject(CARD_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tts = inject(TEXT_TO_SPEECH);
  readonly journey = inject(JourneyService);
  readonly topics = LEARNING_TOPICS.filter(topic => CHAPTER_VOCABULARY[topic.id] && topic.dialogueByLevel.A2.some(turn => turn.speaker === 'user'));
  readonly cards = signal<Flashcard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly topicId = signal('food');
  readonly phaseIndex = signal(this.journey.next('food'));
  readonly chapter = computed(() => this.topics.find(t => t.id === this.topicId()) ?? this.topics[0]);
  readonly chapterWords = computed(() => this.cards().filter(c => (c.topicId === this.topicId() || c.topicId === CHAPTER_VOCABULARY[this.chapter().id]) && c.level === 'A2').slice(0, 5));
  readonly familiarCount = computed(() => this.cards().filter(c => c.level === 'A2' && (c.topicId === this.topicId() || c.topicId === CHAPTER_VOCABULARY[this.chapter().id]) && !!c.lastReviewedAt).length);
  readonly reviewedCount = computed(() => this.cards().filter(c => c.lastReviewedAt).length);
  readonly dueCount = computed(() => this.cards().filter(c => c.lastReviewedAt && Date.parse(c.dueAt) <= Date.now()).length);
  readonly focusCount = computed(() => this.cards().filter(c => c.focused).length);
  ngOnDestroy(): void { this.tts.cancel(); }
  async ngOnInit(): Promise<void> {
    if (this.route.snapshot.queryParamMap.get('practice') === 'focus') {
      await this.router.navigate(['/learn'], {queryParams: {practice: 'focus'}}); return;
    }
    try {
      const saved = localStorage.getItem('spoken.journey.chapter');
      if (this.topics.some(t => t.id === saved)) this.changeChapter(saved!);
      this.cards.set(await this.repo.getAllCards());
    } catch { this.error.set('Could not load your learning overview. You can still browse Learn.'); }
    finally { this.loading.set(false); }
  }
  changeChapter(id: string): void {
    this.topicId.set(id); this.phaseIndex.set(this.journey.next(id));
    try { localStorage.setItem('spoken.journey.chapter', id); } catch { /* Optional preference. */ }
  }
  isDone(index: number): boolean { return this.journey.completed()[this.topicId()]?.includes(index) ?? false; }
  completePreview(): void { this.journey.complete(this.topicId(), this.phaseIndex()); this.phaseIndex.update(i => Math.min(3, i + 1)); }
  async speak(text: string): Promise<void> { try { await this.tts.speak(text, {language: 'nl-NL'}); } catch { this.error.set('Audio is unavailable. You can still read and practise these words.'); } }
  startPhase(): void {
    void this.router.navigate(['/learn'], {queryParams: {topic: this.topicId(), activity: this.phaseIndex() === 3 ? 'dialogue' : 'recall', journey: 'true'}});
  }
}
