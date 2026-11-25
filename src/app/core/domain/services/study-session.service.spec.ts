import { TestBed } from '@angular/core/testing';
import { Flashcard } from '../models/flashcard.model';
import { ANSWER_FEEDBACK, CARD_REPOSITORY, PRONUNCIATION_EVALUATOR, REVIEW_SCHEDULER, SPEECH_RECOGNIZER, TEXT_TO_SPEECH } from '../tokens';
import { JourneyService } from './journey.service';
import { ReminderService } from './reminder.service';
import { StudySessionService } from './study-session.service';

const card = (overrides: Partial<Flashcard> = {}): Flashcard => ({
  id: 'test-1', sourceText: 'bread', targetText: 'brood', level: 'A2', topicId: 'food-and-drink',
  sourceLanguage: 'en-US', targetLanguage: 'nl-NL', status: 'review', repetition: 2,
  intervalDays: 3, easeFactor: 2.5, dueAt: '2020-01-01T00:00:00Z',
  createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
  lastReviewedAt: '2020-01-01T00:00:00Z', ...overrides,
});

describe('Unrestricted practice and journey integration', () => {
  let session: StudySessionService;
  let journey: {active: unknown; finishActivity: jasmine.Spy};
  let repo: {getAllCards: jasmine.Spy; save: jasmine.Spy};
  let scheduler: {schedule: jasmine.Spy};
  beforeEach(() => {
    repo = {getAllCards: jasmine.createSpy().and.resolveTo([]), save: jasmine.createSpy().and.resolveTo()};
    journey = {active: null, finishActivity: jasmine.createSpy()};
    scheduler = {schedule: jasmine.createSpy().and.callFake((value: Flashcard) => value)};
    TestBed.configureTestingModule({providers: [
      {provide: CARD_REPOSITORY, useValue: repo}, {provide: JourneyService, useValue: journey},
      {provide: SPEECH_RECOGNIZER, useValue: {stop: () => {}, listen: () => Promise.resolve({transcript: 'brood'})}},
      {provide: TEXT_TO_SPEECH, useValue: {cancel: () => {}, speak: () => Promise.resolve()}},
      {provide: PRONUNCIATION_EVALUATOR, useValue: {evaluate: () => ({score: 1, passed: true, normalizedActual: 'brood', normalizedExpected: 'brood'})}},
      {provide: REVIEW_SCHEDULER, useValue: scheduler},
      {provide: ANSWER_FEEDBACK, useValue: {playCorrect: () => Promise.resolve()}},
      {provide: ReminderService, useValue: {scheduleNextReminder: () => Promise.resolve()}},
    ]});
    session = TestBed.inject(StudySessionService);
  });

  it('lets selected words be practised before they are due', async () => {
    repo.getAllCards.and.resolveTo([card({focused: true, dueAt: '2099-01-01T00:00:00Z'})]);
    await session.startPractice('FOCUS_WORDS');
    expect(session.currentCard()).toBeNull();
    await session.startPractice('FOCUS_EXTRA');
    expect(session.currentCard()?.id).toBe('test-1');
  });

  it('keeps extra practice from extending review intervals or inflating focus mastery', async () => {
    const original = card({focused: true, focusStreak: 1, dueAt: '2099-01-01T00:00:00Z'});
    repo.getAllCards.and.resolveTo([original]);
    await session.startPractice('FOCUS_EXTRA');
    await session.answerCurrentCard();
    const saved = repo.save.calls.mostRecent().args[0] as Flashcard;
    expect(saved.dueAt).toBe(original.dueAt);
    expect(saved.focusStreak).toBe(1);
    expect(saved.intervalDays).toBe(3);
    expect(saved.reviewCount).toBe(1);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it('maps a conversation chapter to its actual vocabulary and completes recall', async () => {
    repo.getAllCards.and.resolveTo([card()]);
    session.selectLevel('A2'); session.selectTopic('food');
    await session.startPractice('FREE_PRACTICE');
    expect(session.currentCard()?.topicId).toBe('food-and-drink');
    await session.answerCurrentCard(); await session.loadNextCard();
    expect(journey.finishActivity).toHaveBeenCalledWith(1);
  });

  it('never credits an empty vocabulary session', async () => {
    await session.startPractice('FREE_PRACTICE');
    expect(journey.finishActivity).not.toHaveBeenCalled();
  });

  it('does not resurrect a session after the learner changes tabs', async () => {
    let resolve!: (cards: Flashcard[]) => void;
    repo.getAllCards.and.returnValue(new Promise<Flashcard[]>(done => resolve = done));
    const loading = session.startPractice('FREE_PRACTICE');
    session.exitPractice(); resolve([card()]); await loading;
    expect(session.currentCard()).toBeNull();
    expect(session.practiceDeck()).toBeNull();
    expect(session.isLoading()).toBeFalse();
  });

  it('keeps unstudied cards out of review', async () => {
    repo.getAllCards.and.resolveTo([card(), card({id: 'new', status: 'new', repetition: 0, lastReviewedAt: undefined})]);
    await session.startPractice('REVIEW_WORDS');
    expect(session.currentCard()?.id).toBe('test-1');
    await session.loadNextCard();
    expect(session.currentCard()).toBeNull();
  });
  it('ignores recognition that finishes after leaving practice', async () => {
    repo.getAllCards.and.resolveTo([card()]);
    await session.startPractice('FREE_PRACTICE');
    let resolve!: (value: {transcript: string; confidence: number}) => void;
    spyOn(TestBed.inject(SPEECH_RECOGNIZER), 'listen').and.returnValue(new Promise(done => resolve = done));
    const answering = session.answerCurrentCard();
    session.exitPractice(); resolve({transcript: 'brood', confidence: 1}); await answering;
    expect(repo.save).not.toHaveBeenCalled();
    expect(session.lastResult()).toBeNull();
    expect(session.currentCard()).toBeNull();
  });

  it('finishes a conversation even when answers need hints or corrections', async () => {
    session.selectLevel('A2'); session.selectTopic('food'); session.startDialogueAfterFlashcards();
    for (let i = 0; i < 10 && session.currentDialogueUserTurn(); i++) {
      session.revealDialogueAnswer(); await session.answerDialogueTurn(); session.nextDialogueTurn();
    }
    expect(session.isDialogueComplete()).toBeTrue();
    expect(journey.finishActivity).toHaveBeenCalledWith(3);
  });

});
