export interface PracticeWord {
  text: string;
  translation?: string;
  language: string;
  cardId?: string;
}

export interface SentenceCorrectionRequest {
  sourceLanguage: string;
  targetLanguage: string;
  submittedText: string;
  requiredWords: readonly PracticeWord[];
  maxCorrections: number;
  maxPracticeSentences: number;
}

export interface NewPhraseCardSuggestion {
  english: string;
  dutch: string;
}

export interface NaturalAlternativeSuggestion {
  original: string;
  alternative: string;
  note: string;
}

export interface SentenceCorrectionResult {
  originalText: string;
  correctedText: string;
  shortFeedback: string;
  usedWords: readonly string[];
  missingWords: readonly string[];
  speakPractice: readonly string[];
  naturalAlternatives: readonly NaturalAlternativeSuggestion[];
  newPhraseCards: readonly NewPhraseCardSuggestion[];
}
