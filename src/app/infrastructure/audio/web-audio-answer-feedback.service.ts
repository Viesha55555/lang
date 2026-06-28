import { Injectable } from '@angular/core';

import { AnswerFeedbackPort } from '../../core/domain/ports/answer-feedback.port';

interface WindowWithWebAudio extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

@Injectable({ providedIn: 'root' })
export class WebAudioAnswerFeedbackService implements AnswerFeedbackPort {
  private audioContext: AudioContext | null = null;

  async playCorrect(): Promise<void> {
    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime;
    this.playTone(context, now, 659.25, 0.09);
    this.playTone(context, now + 0.08, 987.77, 0.15);
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.audioContext) {
      return this.audioContext;
    }

    const audioWindow = window as WindowWithWebAudio;
    const AudioContextConstructor =
      audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    this.audioContext = new AudioContextConstructor();
    return this.audioContext;
  }

  private playTone(
    context: AudioContext,
    startsAt: number,
    frequency: number,
    duration: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startsAt);

    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startsAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.02);
  }
}
