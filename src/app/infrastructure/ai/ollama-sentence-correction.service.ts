import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  NaturalAlternativeSuggestion,
  NewPhraseCardSuggestion,
  SentenceCorrectionRequest,
  SentenceCorrectionResult,
} from '../../core/domain/models/sentence-correction.model';
import { SentenceCorrectionPort } from '../../core/domain/ports/sentence-correction.port';

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaCorrectionJson {
  corrected?: unknown;
  correctedText?: unknown;
  shortFeedback?: unknown;
  usedWords?: unknown;
  missingWords?: unknown;
  speakPractice?: unknown;
  naturalAlternatives?: unknown;
  newPhraseCards?: unknown;
}

export const OLLAMA_CHAT_ENDPOINT = new InjectionToken<string>(
  'OllamaChatEndpoint',
  {
    providedIn: 'root',
    factory: () => 'http://localhost:11434/api/chat',
  },
);

export const OLLAMA_SENTENCE_CORRECTION_MODEL = new InjectionToken<string>(
  'OllamaSentenceCorrectionModel',
  {
    providedIn: 'root',
    factory: () => 'qwen2.5:1.5b',
  },
);

@Injectable({ providedIn: 'root' })
export class OllamaSentenceCorrectionService
  implements SentenceCorrectionPort
{
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(OLLAMA_CHAT_ENDPOINT);
  private readonly model = inject(OLLAMA_SENTENCE_CORRECTION_MODEL);

  async correct(
    request: SentenceCorrectionRequest,
  ): Promise<SentenceCorrectionResult> {
    const response = await firstValueFrom(
      this.http.post<OllamaChatResponse>(this.endpoint, {
        model: this.model,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
        },
        messages: [
          {
            role: 'system',
            content: this.systemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify(request),
          },
        ],
      }),
    );

    return this.parseResponse(response, request);
  }

  private systemPrompt(): string {
    return [
      'You are a Dutch language tutor for an A2/B1 learner.',
      'Correct the user Dutch text.',
      'Do not chat freely.',
      'Keep the correction simple.',
      'Return valid JSON only.',
      'The user message is JSON with requiredWords and submittedText.',
      'Return exactly this JSON shape:',
      [
        '{ "corrected": string,',
        '"shortFeedback": string, "usedWords": string[],',
        '"missingWords": string[], "speakPractice": string[],',
        '"naturalAlternatives": { "original": string, "alternative": string, "note": string }[],',
        '"newPhraseCards": { "english": string, "dutch": string }[] }',
      ].join(' '),
      'Use only words from requiredWords when deciding usedWords and missingWords.',
      'If the text is already correct, still suggest up to two more natural everyday Dutch alternatives.',
      'Use naturalAlternatives for common Netherlands usage, colloquial phrasing, or more idiomatic words.',
      'For example: if the user writes "ticket", suggest "kaartje" when appropriate.',
      'Do not put natural alternatives in corrected unless the original wording is actually wrong.',
      'Put at most two short Dutch sentences in speakPractice.',
      'Put at most two useful phrase-card suggestions in newPhraseCards; prefer natural everyday Dutch.',
    ].join(' ');
  }

  private parseResponse(
    response: OllamaChatResponse,
    request: SentenceCorrectionRequest,
  ): SentenceCorrectionResult {
    const content = response.message?.content;

    if (!content) {
      throw new Error('Ollama returned an empty correction response.');
    }

    try {
      const parsed = JSON.parse(content) as OllamaCorrectionJson;
      const correctedText = this.asText(
        parsed.corrected ?? parsed.correctedText,
        request.submittedText,
      );

      return {
        originalText: request.submittedText,
        correctedText,
        shortFeedback: this.asText(
          parsed.shortFeedback,
          'Review the corrected sentence and practice it out loud.',
        ),
        usedWords: this.asTextArray(parsed.usedWords),
        missingWords: this.asTextArray(parsed.missingWords),
        speakPractice: this.asTextArray(parsed.speakPractice),
        naturalAlternatives: this.asNaturalAlternatives(
          parsed.naturalAlternatives,
        ),
        newPhraseCards: this.asPhraseCards(parsed.newPhraseCards),
      };
    } catch {
      throw new Error('Ollama returned correction output that was not JSON.');
    }
  }

  private asText(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private asTextArray(value: unknown): readonly string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private asNaturalAlternatives(
    value: unknown,
  ): readonly NaturalAlternativeSuggestion[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(
        (
          item,
        ): item is {
          original: unknown;
          alternative: unknown;
          note: unknown;
        } =>
          typeof item === 'object' &&
          item !== null &&
          'original' in item &&
          'alternative' in item &&
          'note' in item,
      )
      .map((item) => ({
        original: this.asText(item.original, ''),
        alternative: this.asText(item.alternative, ''),
        note: this.asText(item.note, ''),
      }))
      .filter((item) => item.original && item.alternative && item.note);
  }

  private asPhraseCards(value: unknown): readonly NewPhraseCardSuggestion[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(
        (
          item,
        ): item is {
          english: unknown;
          dutch: unknown;
        } =>
          typeof item === 'object' &&
          item !== null &&
          'english' in item &&
          'dutch' in item,
      )
      .map((item) => ({
        english: this.asText(item.english, ''),
        dutch: this.asText(item.dutch, ''),
      }))
      .filter((item) => item.english && item.dutch);
  }
}
