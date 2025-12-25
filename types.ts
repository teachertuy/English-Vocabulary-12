
export interface QuizQuestion {
  sentence: string;
  options: string[];
  answer: string;
  translation: string;
  explanation: string;
}

export interface PlayerData {
  name: string;
  class: string;
}

export interface QuizAnswerDetail {
  question: string;
  translation: string;
  options: string[];
  userAnswer: string | null;
  correctAnswer: string;
  status: 'correct' | 'incorrect' | null;
  explanation: string;
}

export interface GameResult {
  playerName: string;
  playerClass: string;
  score: string;
  correct: number;
  incorrect: number;
  answered: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  timestamp?: number;
  details: QuizAnswerDetail[];
  cheatAttempts?: number;
  gameType?: 'quiz' | 'spelling' | 'matching' | 'vocabulary';
  attempts?: number;
  status?: 'in-progress' | 'completed';
}

// FIX: Add the missing SavedQuiz interface, which is used in ViewQuizModal.tsx.
export interface SavedQuiz {
  name:string;
  questions: QuizQuestion[];
}

export type AddResultStatus = 'success' | 'duplicate' | 'invalid';

export interface StudentProgress {
  name: string;
  class: string;
  correct: number;
  incorrect: number;
}

export interface UnitStatus {
  enabled: boolean;
}

export interface UnitsState {
  [unitId: string]: UnitStatus;
}

export interface VocabularyWord {
  word: string;
  type: string; // e.g., 'n', 'v', 'adj'
  phonetic: string;
  translation: string;
  example?: string; // Simple English example sentence
  image?: string; // URL to the image
  audio?: string; // Base64 audio string
}
