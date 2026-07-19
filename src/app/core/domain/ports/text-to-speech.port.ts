export interface TextToSpeechOptions {
  language: string;
  /** Speech rate: 1.0 is normal, 0.85 is slightly slower (better for learners). */
  rate?: number;
}

export interface TextToSpeechPort {
  speak(text: string, options: TextToSpeechOptions): Promise<void>;
  cancel(): void;
}
