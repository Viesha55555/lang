export interface DutchUsageSuggestion {
  readonly correctedText: string;
  readonly note: string;
}

interface UsageRule {
  readonly pattern: RegExp;
  readonly replacement: string;
  readonly note: string;
}

const USAGE_RULES: readonly UsageRule[] = [
  {
    pattern: /\bnaar winkel\b/i,
    replacement: 'naar de winkel',
    note: "Use the definite article in 'naar de winkel'.",
  },
  {
    pattern: /\b(wacht|wachten|wachtte|wachtten)\s+voor\b/i,
    replacement: '$1 op',
    note: "Use 'wachten op' when saying what or whom you are waiting for.",
  },
  {
    pattern: /\b(heb|hebt|heeft|hadden|had)\s+voor\b(.{1,80})\bgewacht\b/i,
    replacement: '$1 op$2gewacht',
    note: "Use 'wachten op' when saying what or whom you waited for.",
  },
  {
    pattern: /\b(luister|luistert|luisteren|luisterde|luisterden)\s+(?:aan|op)\b/i,
    replacement: '$1 naar',
    note: "Use 'luisteren naar' for the person or thing you are listening to.",
  },
  {
    pattern: /\b(ben|bent|is|zijn|was|waren)\s+bang\s+van\b/i,
    replacement: '$1 bang voor',
    note: "Use 'bang zijn voor' when naming what someone is afraid of.",
  },
  {
    pattern: /\b(geïnteresseerd|geinteresseerd)\s+(?:over|voor)\b/i,
    replacement: '$1 in',
    note: "Use 'geïnteresseerd in' when naming an interest.",
  },
];

export function suggestDutchUsage(
  transcript: string,
): DutchUsageSuggestion | null {
  for (const rule of USAGE_RULES) {
    if (!rule.pattern.test(transcript)) {
      continue;
    }

    return {
      correctedText: transcript.replace(rule.pattern, rule.replacement),
      note: rule.note,
    };
  }

  return null;
}
