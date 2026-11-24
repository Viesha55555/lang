import { LocalStorageCardRepositoryService } from './local-storage-card-repository.service';

const KEY = 'spoken-flashcards.cards.v2';

describe('duplicate seed card migration', () => {
  let service: LocalStorageCardRepositoryService;
  let original: string | null;

  beforeEach(() => {
    original = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    service = new LocalStorageCardRepositoryService();
  });

  afterEach(() => {
    if (original === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, original);
  });

  it('keeps the latest review schedule and focus when merging, and is idempotent', async () => {
    const seed = (await service.getAllCards()).find(c => c.id === 'a1-0308-the-station')!;
    const survivor = { ...seed, focused: true, reviewCount: 8, lastReviewedAt: '2026-11-20T00:00:00Z' };
    const retired = {
      ...seed, id: 'a2-0005-the-station', level: 'A2', repetition: 3,
      status: 'review', intervalDays: 12, reviewCount: 5,
      lastReviewedAt: '2026-11-24T00:00:00Z', dueAt: '2026-12-06T00:00:00Z',
    };
    const custom = { ...seed, id: 'custom-station' };
    localStorage.setItem(KEY, JSON.stringify([survivor, retired, custom]));
    const cards = await service.getAllCards();
    const merged = cards.find(c => c.id === seed.id)!;
    expect(merged.level).toBe('A1');
    expect(merged.repetition).toBe(3);
    expect(merged.dueAt).toBe(retired.dueAt);
    expect(merged.focused).toBeTrue();
    expect(merged.reviewCount).toBe(8);
    expect(cards.some(c => c.id === retired.id)).toBeFalse();
    expect(cards.find(c => c.id === custom.id)).toEqual(JSON.parse(JSON.stringify(custom)));
    const reloaded = await service.getAllCards();
    expect(reloaded.find(c => c.id === seed.id)).toEqual(JSON.parse(JSON.stringify(merged)));
    expect(reloaded.some(c => c.id === retired.id)).toBeFalse();
  });

  it('moves progress even when only the retired card exists', async () => {
    const seed = (await service.getAllCards()).find(c => c.id === 'a1-0282-to-pay-by-card')!;
    localStorage.setItem(KEY, JSON.stringify([{ ...seed, id: 'a2-0049-card-payment', repetition: 4 }]));
    const merged = (await service.getAllCards()).find(c => c.id === seed.id)!;
    expect(merged.repetition).toBe(4);
    expect(merged.acceptedAnswers).toContain('met de pin betalen');
  });
});
