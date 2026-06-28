export interface SpeechRecognitionResult {
  transcript: string;
  confidence?: number;
}

export interface SpeechListenOptions {
  language: string;
  silenceTimeoutMs: number;
  maxDurationMs: number;
}

export interface SpeechRecognizerPort {
  listen(options: SpeechListenOptions): Promise<SpeechRecognitionResult>;
  stop(): void;
}
