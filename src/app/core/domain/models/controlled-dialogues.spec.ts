import { CardLevel } from './flashcard.model';
import { findLearningTopic } from './learning-topics';

describe('controlled dialogues', () => {
  const levels: readonly CardLevel[] = ['A1', 'A2', 'B1'];
  const topicIds = ['shopping', 'food', 'hardware-store'] as const;

  for (const topicId of topicIds) {
    for (const level of levels) {
      it(`provides complete ${level} instructions for ${topicId}`, () => {
        const dialogue = findLearningTopic(topicId)?.dialogueByLevel[level] ?? [];
        const appTurns = dialogue.filter((turn) => turn.speaker === 'app');
        const learnerTurns = dialogue.filter((turn) => turn.speaker === 'user');

        expect(appTurns.length).toBeGreaterThan(0);
        expect(learnerTurns.length).toBeGreaterThan(0);
        expect(appTurns.every((turn) => Boolean(turn.translation))).toBeTrue();
        expect(
          learnerTurns.every(
            (turn) => Boolean(turn.instruction) && Boolean(turn.targetTemplate),
          ),
        ).toBeTrue();
      });
    }
  }

  it('keeps advanced targets focused while practising connectors', () => {
    for (const topicId of topicIds) {
      const b1Turns =
        findLearningTopic(topicId)?.dialogueByLevel.B1.filter(
          (turn) => turn.speaker === 'user',
        ) ?? [];

      expect(
        b1Turns.some((turn) =>
          /\b(omdat|hoewel|vanwege)\b/i.test(turn.text),
        ),
      ).toBeTrue();
      expect(b1Turns.every((turn) => turn.text.split(/\s+/).length <= 14)).toBeTrue();
    }
  });
});
