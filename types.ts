
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
  activityId?: string;
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
  type: string;
  phonetic: string;
  translation: string;
  image?: string;
  audio?: string;
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
    startButtonText: string;
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
    // Header & Global
    mainTitle: string;
    mainTitleFontSize: number;
    mainTitleColor: string;
    subtitle: string;
    subtitleFontSize: number;
    subtitleColor: string;
    backButtonText: string;

    // Main Category Cards
    card1Title: string;
    card1Icon: string;
    card1Color: string;
    card2Title: string;
    card2Icon: string;
    card2Color: string;
    cardFontSize: number;
    cardHeight: number;
    cardBorderRadius: number;

    // Unit/Topic Grid
    unitLabelText: string;
    topicLabelText: string;
    exitButtonText: string;
    unitCardBgColor: string; // Default/Fallback
    unitCardColors: string[]; // Array of colors for Units 1-10
    topicCardColors: string[]; // Array of colors for Topics (repeating)
    unitCardTextColor: string;
    unitCardLabelColor: string;
    unitCardFontSize: number;
    unitCardHeight: number;
    unitCardBorderRadius: number;
    dividerColor1: string; // Line 1
    dividerColor2: string; // Line 2

    // Activity Labels & Descriptions
    activityLearnLabel: string;
    activityLearnDesc: string;
    activityMatchLabel: string;
    activityMatchDesc: string;
    activitySpellLabel: string;
    activitySpellDesc: string;
    activityQuizLabel: string;
    activityQuizDesc: string;
}
