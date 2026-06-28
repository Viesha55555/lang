export interface AnswerFeedbackPort {
  playCorrect(): Promise<void>;
}
