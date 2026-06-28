import { Injectable } from '@angular/core';

import {
  SpeechListenOptions,
  SpeechRecognitionResult,
  SpeechRecognizerPort,
} from '../../core/domain/ports/speech-recognizer.port';
import {
  BrowserSpeechRecognition,
  BrowserSpeechRecognitionErrorEvent,
  BrowserSpeechRecognitionEvent,
} from './web-speech.types';

@Injectable({ providedIn: 'root' })
export class WebSpeechRecognizerService implements SpeechRecognizerPort {
  private recognition?: BrowserSpeechRecognition;
  private silenceTimer?: ReturnType<typeof setTimeout>;
  private maxTimer?: ReturnType<typeof setTimeout>;

  listen(options: SpeechListenOptions): Promise<SpeechRecognitionResult> {
    const RecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      return Promise.reject(
        new Error(
          'Speech recognition is not supported in this browser. Try Chrome or Edge, or use a future native app build.',
        ),
      );
    }

    this.abortCurrentRecognition();

    return new Promise((resolve, reject) => {
      const recognition = new RecognitionConstructor();
      let finalTranscript = '';
      let latestInterimTranscript = '';
      let confidence: number | undefined;
      let settled = false;

      recognition.lang = options.language;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      this.recognition = recognition;

      const cleanup = (): void => {
        this.clearTimers();
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        if (this.recognition === recognition) {
          this.recognition = undefined;
        }
      };

      const finish = (): void => {
        if (settled) {
          return;
        }

        settled = true;
        const transcript = (finalTranscript || latestInterimTranscript).trim();
        cleanup();

        try {
          recognition.stop();
        } catch {
          // The browser may already have stopped after detecting silence.
        }

        resolve({ transcript, confidence });
      };

      const resetSilenceTimer = (): void => {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
        }

        this.silenceTimer = setTimeout(finish, options.silenceTimeoutMs);
      };

      recognition.onresult = (event: BrowserSpeechRecognitionEvent): void => {
        latestInterimTranscript = '';

        for (
          let resultIndex = event.resultIndex;
          resultIndex < event.results.length;
          resultIndex += 1
        ) {
          const result = event.results[resultIndex];
          const bestAlternative = result?.[0];

          if (!bestAlternative) {
            continue;
          }

          confidence = bestAlternative.confidence || confidence;

          if (result.isFinal) {
            finalTranscript += ` ${bestAlternative.transcript}`;
          } else {
            latestInterimTranscript += ` ${bestAlternative.transcript}`;
          }
        }

        if ((finalTranscript || latestInterimTranscript).trim()) {
          resetSilenceTimer();
        }
      };

      recognition.onerror = (
        event: BrowserSpeechRecognitionErrorEvent,
      ): void => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(new Error(this.errorMessage(event)));
      };

      recognition.onend = (): void => {
        finish();
      };

      this.maxTimer = setTimeout(finish, options.maxDurationMs);

      try {
        recognition.start();
      } catch (error: unknown) {
        settled = true;
        cleanup();
        reject(
          error instanceof Error
            ? error
            : new Error('Could not start speech recognition.'),
        );
      }
    });
  }

  stop(): void {
    const recognition = this.recognition;

    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch {
      this.abortCurrentRecognition();
    }
  }

  private abortCurrentRecognition(): void {
    this.clearTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore browsers that report an invalid state after ending.
      }

      this.recognition = undefined;
    }
  }

  private clearTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    if (this.maxTimer) {
      clearTimeout(this.maxTimer);
    }

    this.silenceTimer = undefined;
    this.maxTimer = undefined;
  }

  private errorMessage(event: BrowserSpeechRecognitionErrorEvent): string {
    switch (event.error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone access was denied. Allow microphone access and try again.';
      case 'audio-capture':
        return 'No microphone was found or it is unavailable.';
      case 'network':
        return 'Speech recognition could not reach its network service.';
      case 'no-speech':
        return 'No speech was detected. Try again and speak clearly.';
      case 'aborted':
        return 'Listening was stopped.';
      default:
        return event.message || `Speech recognition error: ${event.error}`;
    }
  }
}
