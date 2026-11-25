import { Injectable, signal } from '@angular/core';
import { TopicId } from '../models/learning-topic.model';

@Injectable({ providedIn: 'root' })
export class JourneyService {
  readonly phases = ['Meet the words', 'Recall them', 'Use phrases', 'Try a conversation'];
  readonly completed = signal<Record<string, number[]>>(this.read());
  readonly storageError = signal('');
  active: { topic: TopicId; phase: number } | null = null;

  private read(): Record<string, number[]> {
    try {
      const value: unknown = JSON.parse(localStorage.getItem('spoken.journey.v1') ?? '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([, phases]) =>
        Array.isArray(phases) && phases.every(p => Number.isInteger(p) && p >= 0 && p < 4)));
    } catch { return {}; }
  }

  next(topic: string): number {
    const done = this.completed()[topic] ?? [];
    const next = this.phases.findIndex((_, index) => !done.includes(index));
    return next < 0 ? 0 : next;
  }

  complete(topic: string, phase: number): void {
    const done = this.completed()[topic] ?? [];
    if (done.includes(phase)) return;
    this.completed.update(all => ({ ...all, [topic]: [...done, phase] }));
    try { localStorage.setItem('spoken.journey.v1', JSON.stringify(this.completed())); }
    catch { this.storageError.set('Progress is available this visit, but could not be saved on this device.'); }
  }

  finishActivity(phase: number): void {
    if (this.active?.phase === phase) {
      this.complete(this.active.topic, phase);
      this.active = null;
    }
  }
}
