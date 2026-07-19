import { Injectable } from '@angular/core';

import {
  TextToSpeechOptions,
  TextToSpeechPort,
} from '../../core/domain/ports/text-to-speech.port';

@Injectable({ providedIn: 'root' })
export class WebSpeechSynthesisService implements TextToSpeechPort {
  speak(text: string, options: TextToSpeechOptions): Promise<void> {
    if (!window.speechSynthesis) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.language;
      utterance.rate = options.rate ?? 0.85;

      const preferredVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith(options.language.slice(0, 2)));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();

      utterance.onerror = (event) => {
        // 'interrupted' and 'canceled' happen when cancel() is called — not an error.
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    window.speechSynthesis?.cancel();
  }
}
