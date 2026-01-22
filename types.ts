
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
    inputNameBorderColor: string;
    inputNameBorderWidth: number;
    inputClassWidth: number;
    inputClassFontSize: number;
    inputClassColor: string;
    inputClassPlaceholder: string;
    inputClassBorderColor: string;
    inputClassBorderWidth: number;
    startButtonText: string;
    startButtonSize: number;
    startButtonBgColor: string;
    startButtonTextColor: string;
    startButtonRingColor: string;
    startButtonRingWidth: number;
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

    // Unit Grid Config
    unitLabelText: string;
    unitCardColors: string[];
    unitCardTextColor: string;
    unitCardLabelColor: string;
    unitCardFontSize: number;
    unitCardHeight: number;
    unitCardWidth: number;
    unitCardBorderRadius: number;
    unitItemsPerRow: number;

    // Topic Grid Config
    topicLabelText: string;
    topicCardColors: string[];
    topicCardTextColor: string;
    topicCardLabelColor: string;
    topicCardFontSize: number;
    topicCardHeight: number;
    topicCardWidth: number;
    topicCardBorderRadius: number;
    topicItemsPerRow: number;

    // Design Global
    exitButtonText: string;
    dividerColor1: string;
    dividerColor2: string;

    // Activity Labels & Descriptions
    activityLearnLabel: string;
    activityLearnDesc: string;
    activityMatchLabel: string;
    activityMatchDesc: string;
    activitySpellLabel: string;
    activitySpellDesc: string;
    activityQuizLabel: string;
    activityQuizDesc: string;

    // Activity Durations (in minutes)
    quizDuration: number;
    spellingDuration: number;
    matchingDuration: number;
}
