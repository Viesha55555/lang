import { inject, Injectable } from '@angular/core';

import { CARD_REPOSITORY } from '../tokens';

const SW_PATH = '/sw.js';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly cards = inject(CARD_REPOSITORY);
  private swRegistration: ServiceWorkerRegistration | null = null;

  get isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  get permission(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  async init(): Promise<void> {
    if (!this.isSupported) {
      return;
    }

    await this.registerServiceWorker();

    if (this.permission === 'granted') {
      await this.scheduleNextReminder();
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    const result = await Notification.requestPermission();

    if (result === 'granted') {
      await this.scheduleNextReminder();
    }

    return result === 'granted';
  }

  async scheduleNextReminder(): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    const allCards = await this.cards.getAllCards();
    const futureDues = allCards
      .map((card) => new Date(card.dueAt).getTime())
      .filter((t) => t > Date.now());

    if (futureDues.length === 0) {
      return;
    }

    const nextDueAt = new Date(Math.min(...futureDues)).toISOString();

    this.postToSW({ type: 'SCHEDULE_REMINDER', dueAt: nextDueAt });
    await this.tryRegisterPeriodicSync();
  }

  cancelReminders(): void {
    this.postToSW({ type: 'CANCEL_REMINDER' });
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.swRegistration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });
    } catch {
      // Service worker registration failed silently — notifications won't work
      // but the rest of the app is unaffected.
    }
  }

  private async tryRegisterPeriodicSync(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const syncManager = (this.swRegistration as any).periodicSync;

      if (syncManager) {
        await syncManager.register('spoken-flashcards.reminder', {
          minInterval: 60 * 60 * 1000, // 1 hour minimum
        });
      }
    } catch {
      // Periodic Background Sync not supported or permission not granted — fine.
    }
  }

  private postToSW(message: Record<string, unknown>): void {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }
}
