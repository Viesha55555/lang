import { normalizeText } from './normalize-text';
import {
  DutchUsageSuggestion,
  suggestDutchUsage,
} from './dutch-usage-patterns';

export type ChallengeRelevance = 'relevant' | 'partly-relevant' | 'not-relevant';
export type ChallengeGrammar = 'correct' | 'understandable-with-errors' | 'needs-retry';
export type LearnedPhraseUsage = 'exact' | 'variant' | 'attempted';

export interface SpeakingChallengePrompt {
  readonly text: string;
  readonly intent: 'past-activity' | 'past-event' | 'open';
  readonly minimumWords: number;
}

export interface SpeakingChallengeCardInput {
  readonly id: string;
  readonly targetText: string;
}

export interface SpeakingChallengePhraseUsage {
  readonly phrase: string;
  readonly usage: LearnedPhraseUsage;
}

export interface SpeakingChallengeAnalysis {
  readonly speechDetected: boolean;
  readonly relevance: ChallengeRelevance;
  readonly grammar: ChallengeGrammar;
  readonly learnedPhrases: readonly SpeakingChallengePhraseUsage[];
  readonly correction: DutchUsageSuggestion | null;
}

const PAST_MARKERS = [
  'was', 'waren', 'had', 'hadden', 'ging', 'gingen', 'werkte', 'woonde',
  'maakte', 'kocht', 'zei', 'deed', 'bleek', 'gisteren', 'vorige',
] as const;
const PERFECT_AUXILIARIES = ['heb', 'hebt', 'heeft', 'ben', 'bent', 'is', 'zijn'] as const;
const PAST_PARTICIPLES = [
  'gewerkt', 'gewoond', 'gemaakt', 'gekocht', 'gezegd', 'gedaan', 'gegeten',
  'gegaan', 'gekomen', 'vertrokken', 'aangekomen', 'gebeld', 'gewacht',
] as const;

export function analyzeSpeakingChallenge(
  transcript: string,
  prompt: SpeakingChallengePrompt,
  cards: readonly SpeakingChallengeCardInput[],
): SpeakingChallengeAnalysis {
  const normalized = normalizeText(transcript);
  const words = normalized.split(' ').filter(Boolean);
  const correction = suggestDutchUsage(transcript);
  const learnedPhrases = cards
    .map((card) => matchLearnedPhrase(normalized, card.targetText))
    .filter((usage): usage is SpeakingChallengePhraseUsage => usage !== null);

  if (!normalized) {
    return {
      speechDetected: false,
      relevance: 'not-relevant',
      grammar: 'needs-retry',
      learnedPhrases,
      correction,
    };
  }

  const pastRelevant = hasPastForm(words);
  const enoughContent = words.length >= prompt.minimumWords;
  const relevance: ChallengeRelevance = prompt.intent === 'open'
    ? (enoughContent ? 'relevant' : 'partly-relevant')
    : (pastRelevant && enoughContent
      ? 'relevant'
      : (pastRelevant ? 'partly-relevant' : 'not-relevant'));
  const grammarCorrection = correction ?? suggestPastTenseCorrection(transcript);
  const incoherent = isClearlyIncomplete(normalized) || isClearlyIncoherent(normalized);
  const grammar: ChallengeGrammar = incoherent
    ? 'needs-retry'
    : (grammarCorrection ? 'understandable-with-errors' : 'correct');

  return {
    speechDetected: true,
    relevance,
    grammar,
    learnedPhrases,
    correction: grammarCorrection,
  };
}

function hasPastForm(words: readonly string[]): boolean {
  return words.some((word) => PAST_MARKERS.includes(word as typeof PAST_MARKERS[number])) ||
    (words.some((word) => PERFECT_AUXILIARIES.includes(word as typeof PERFECT_AUXILIARIES[number])) &&
      words.some((word) => PAST_PARTICIPLES.includes(word as typeof PAST_PARTICIPLES[number])));
}

function matchLearnedPhrase(
  normalizedTranscript: string,
  phrase: string,
): SpeakingChallengePhraseUsage | null {
  const normalizedPhrase = normalizeText(phrase);
  if (normalizedTranscript.includes(normalizedPhrase)) {
    const phraseWords = normalizedPhrase.split(' ');
    const finalWord = phraseWords.at(-1);
    const phraseStartsTranscript = normalizedTranscript.startsWith(`${normalizedPhrase} `);
    const misplacedPerfectParticiple = phraseStartsTranscript &&
      phraseWords.some((word) => PERFECT_AUXILIARIES.includes(word as typeof PERFECT_AUXILIARIES[number])) &&
      PAST_PARTICIPLES.includes(finalWord as typeof PAST_PARTICIPLES[number]);

    if (misplacedPerfectParticiple) {
      return { phrase, usage: 'attempted' };
    }

    return { phrase, usage: normalizedTranscript === normalizedPhrase ? 'exact' : 'variant' };
  }

  const phraseWords = normalizedPhrase.split(' ');
  const keyForm = [...phraseWords].reverse().find((word) =>
    PAST_PARTICIPLES.includes(word as typeof PAST_PARTICIPLES[number]) ||
    PAST_MARKERS.includes(word as typeof PAST_MARKERS[number]),
  );

  return keyForm && normalizedTranscript.split(' ').includes(keyForm)
    ? { phrase, usage: 'attempted' }
    : null;
}

function suggestPastTenseCorrection(
  transcript: string,
): DutchUsageSuggestion | null {
  if (/\bik ga tijd\b/i.test(transcript)) {
    return {
      correctedText: transcript.replace(/\bik ga tijd\b/i, 'Ik had tijd'),
      note: "To say that you had time, use the past tense of 'hebben': 'ik had tijd'.",
    };
  }

  const wrongZijnAuxiliary = /\bik heb (gegaan|gekomen|vertrokken|aangekomen)\b/i;
  if (wrongZijnAuxiliary.test(transcript)) {
    return {
      correctedText: transcript.replace(wrongZijnAuxiliary, 'Ik ben $1'),
      note: "Use 'zijn' with these movement verbs in the perfect tense.",
    };
  }

  const misplacedObject = /\bik heb (gekocht|gegeten|gemaakt) (.+)$/i;
  const match = transcript.match(misplacedObject);
  if (match) {
    const repairedObject = repairLikelyIndefiniteArticle(match[2]);
    const articleWasRepaired = repairedObject !== match[2];
    return {
      correctedText: `Ik heb ${repairedObject} ${match[1]}`,
      note: articleWasRepaired
        ? "Use 'een' as the article, and put the object before the past participle."
        : 'In a Dutch main clause, put the object before the past participle.',
    };
  }

  if (/\bik heeft\b/i.test(transcript)) {
    return {
      correctedText: transcript.replace(/\bik heeft\b/i, 'Ik heb'),
      note: "Use 'heb' with 'ik'.",
    };
  }

  if (/\bhij heb\b/i.test(transcript)) {
    return {
      correctedText: transcript.replace(/\bhij heb\b/i, 'Hij heeft'),
      note: "Use 'heeft' with 'hij'.",
    };
  }

  return null;
}

function repairLikelyIndefiniteArticle(object: string): string {
  // Speech recognition commonly confuses the identically pronounced "een" and
  // "en". Only repair it where a noun directly follows, not in a conjunction.
  return object.replace(
    /^en\s+(maaltijd|broodje|kaas|drankje|cadeau|boek|kaartje)\b/i,
    'een $1',
  );
}

function isClearlyIncomplete(normalized: string): boolean {
  return /^(ik )?(heb|had) (nooit )?(gedaan|gekocht|gezegd)$/.test(normalized);
}

function isClearlyIncoherent(normalized: string): boolean {
  return /\b(geld|kaas|eten) (ben|bent|is|zijn|vertrok|vertrokken)\b/.test(normalized) ||
    /\bga tijd\b/.test(normalized);
}
