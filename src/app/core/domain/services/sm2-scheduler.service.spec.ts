import { Flashcard } from '../models/flashcard.model';
import { Sm2SchedulerService } from './sm2-scheduler.service';

describe('Sm2SchedulerService', () => {
  const reviewedAt = new Date('2026-06-20T12:00:00.000Z');
  let service: Sm2SchedulerService;
  let card: Flashcard;

  beforeEach(() => {
    service = new Sm2SchedulerService();
    card = {
      id: 'card-1',
      sourceText: 'apple',
      targetText: 'appel',
      sourceLanguage: 'en-US',
      targetLanguage: 'nl-NL',
      status: 'new',
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: reviewedAt.toISOString(),
      createdAt: reviewedAt.toISOString(),
      updatedAt: reviewedAt.toISOString(),
    };
  });

  it('schedules again in ten minutes and lowers ease', () => {
    const result = service.schedule(card, 'again', reviewedAt);

    expect(result.dueAt).toBe('2026-06-20T12:10:00.000Z');
    expect(result.easeFactor).toBe(2.3);
    expect(result.status).toBe('learning');
    expect(result.repetition).toBe(0);
    expect(result.reviewCount).toBe(1);
    expect(result.lapseCount).toBe(1);
  });

  it('graduates a good new card to one day', () => {
    const result = service.schedule(card, 'good', reviewedAt);

    expect(result.dueAt).toBe('2026-06-21T12:00:00.000Z');
    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(1);
    expect(result.reviewCount).toBe(1);
  });

  it('counts hard answers separately for weak word ranking', () => {
    card.reviewCount = 3;
    card.hardCount = 1;

    const result = service.schedule(card, 'hard', reviewedAt);

    expect(result.reviewCount).toBe(4);
    expect(result.hardCount).toBe(2);
  });

  it('graduates an easy new card to four days and raises ease', () => {
    const result = service.schedule(card, 'easy', reviewedAt);

    expect(result.dueAt).toBe('2026-06-24T12:00:00.000Z');
    expect(result.intervalDays).toBe(4);
    expect(result.easeFactor).toBe(2.65);
  });

  it('never lowers ease below 1.3', () => {
    card.easeFactor = 1.3;

    const result = service.schedule(card, 'again', reviewedAt);

    expect(result.easeFactor).toBe(1.3);
  });

  it('does not mutate the original card', () => {
    const original = { ...card };

    service.schedule(card, 'good', reviewedAt);

    expect(card).toEqual(original);
  });
});
