import { suggestDutchUsage } from './dutch-usage-patterns';

describe('suggestDutchUsage', () => {
  it('corrects wachten voor with a finite verb', () => {
    expect(suggestDutchUsage('Ik wacht voor de trein')).toEqual({
      correctedText: 'Ik wacht op de trein',
      note: "Use 'wachten op' when saying what or whom you are waiting for.",
    });
  });

  it('corrects wachten voor in the perfect tense', () => {
    expect(suggestDutchUsage('Ik heb voor de trein gewacht')).toEqual({
      correctedText: 'Ik heb op de trein gewacht',
      note: "Use 'wachten op' when saying what or whom you waited for.",
    });
  });

  it('does not require a preposition when no object is given', () => {
    expect(suggestDutchUsage('Ik moet lang wachten')).toBeNull();
  });

  it('does not change a correct wachten op construction', () => {
    expect(suggestDutchUsage('Ik wacht op de trein')).toBeNull();
  });

  it('corrects other high-confidence usage patterns', () => {
    expect(suggestDutchUsage('Ik luister aan de radio')?.correctedText)
      .toBe('Ik luister naar de radio');
    expect(suggestDutchUsage('Ik ben bang van honden')?.correctedText)
      .toBe('Ik ben bang voor honden');
  });
});
