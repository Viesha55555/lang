import { JourneyService } from './journey.service';

describe('Optional learning journey', () => {
  let saved: string | null;
  beforeEach(() => { saved = localStorage.getItem('spoken.journey.v1'); localStorage.removeItem('spoken.journey.v1'); });
  afterEach(() => { if (saved === null) localStorage.removeItem('spoken.journey.v1'); else localStorage.setItem('spoken.journey.v1', saved); });

  it('allows later phases first and restores completion without duplicate credit', () => {
    const journey = new JourneyService();
    journey.complete('food', 3);
    journey.complete('food', 3);
    expect(new JourneyService().completed()['food']).toEqual([3]);
    expect(journey.next('food')).toBe(0);
  });

  it('only credits the activity started for this journey', () => {
    const journey = new JourneyService();
    journey.active = {topic: 'food', phase: 1};
    journey.finishActivity(3);
    expect(journey.completed()['food']).toBeUndefined();
    journey.finishActivity(1);
    expect(journey.completed()['food']).toEqual([1]);
    expect(journey.active).toBeNull();
  });

  it('ignores malformed saved phase data', () => {
    localStorage.setItem('spoken.journey.v1', '{"food":"bad","home":[8],"work":[0,2]}');
    expect(new JourneyService().completed()).toEqual({work: [0, 2]});
  });
});
