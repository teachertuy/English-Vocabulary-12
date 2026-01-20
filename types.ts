
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
  image?: string; // URL to the image
  audio?: string; // Base64 audio string
}

export interface WelcomeScreenConfig {
    titleText: string;
    titleFontSize: number;
    titleFontSizeLine2: number;
    titleColor: string;
    inputNameWidth: number;
    inputNameFontSize: number;
    inputNameColor: string;
    inputNamePlaceholder: string;
    inputClassWidth: number;
    inputClassFontSize: number;
    inputClassColor: string;
    inputClassPlaceholder: string;
}

export interface DashboardConfig {
    unitsTabLabel: string;
    topicsTabLabel: string;
    tabFontSize: number;
    tabPadding: number;
    sectionTitleFontSize: number;
    sectionTitleColor: string;
    cardUnitLabel: string;
    cardTopicLabel: string;
    cardLabelFontSize: number;
    cardLabelColor: string;
    cardValueFontSize: number;
    manageButtonText: string;
    manageButtonFontSize: number;
    manageButtonColor: string;
}

export interface ExerciseSelectionConfig {
    mainTitle: string;
    mainTitleFontSize: number;
    mainTitleColor: string;
    card1Title: string;
    card1Icon: string;
    card1Color: string;
    card2Title: string;
    card2Icon: string;
    card2Color: string;
    cardFontSize: number;
    cardHeight: number; // rem
    cardBorderRadius: number; // px
}
