
import React, { useState, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import TeacherDashboard from './components/TeacherDashboard';
import PasswordModal from './components/PasswordModal';
import { PlayerData, QuizQuestion, GameResult, VocabularyWord, ExerciseSelectionConfig } from './types';
import { FIXED_CLASSROOM_ID, TEACHER_PASSWORD } from './constants';
import { removeStudentPresence, startUnitActivity, listenToExerciseSelectionConfig } from './services/firebaseService';
import UnitSelectionScreen from './components/UnitSelectionScreen';
import VocabularyScreen from './components/VocabularyScreen';
import SpellingGameScreen from './components/SpellingGameScreen';
import MatchingGameScreen from './components/MatchingGameScreen';
import ExerciseTypeSelectionScreen from './components/ExerciseTypeSelectionScreen';


enum Screen {
  Welcome,
  ExerciseTypeSelection,
  UnitSelection,
  Quiz,
  SpellingGame,
  MatchingGame,
  Vocabulary,
  Results,
  Dashboard,
  LoggedOut,
}

const DEFAULT_EXERCISE_CONFIG: ExerciseSelectionConfig = {
    mainTitle: 'TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ',
    mainTitleFontSize: 1.875,
    mainTitleColor: '#dc2626',
    subtitle: '(Chọn một mục bên dưới để bắt đầu luyện tập)',
    subtitleFontSize: 1.125,
    subtitleColor: '#4b5563',
    backButtonText: 'Quay lại',
    card1Title: 'English 12',
    card1Icon: '📝',
    card1Color: '#3b82f6',
    card2Title: 'Topic-based vocabulary',
    card2Icon: '📰',
    card2Color: '#a855f7',
    cardFontSize: 1.5,
    cardHeight: 10,
    cardBorderRadius: 16,
    unitLabelText: 'UNIT',
    unitCardColors: [],
    unitCardTextColor: '#ffffff',
    unitCardLabelColor: '#fde047',
    unitCardFontSize: 2.25,
    unitCardHeight: 7,
    unitCardWidth: 100,
    unitCardBorderRadius: 8,
    unitItemsPerRow: 5,
    topicLabelText: 'TOPIC',
    topicCardColors: [],
    topicCardTextColor: '#ffffff',
    topicCardLabelColor: '#fde047',
    topicCardFontSize: 1.8,
    topicCardHeight: 6,
    topicCardWidth: 100,
    topicCardBorderRadius: 12,
    topicItemsPerRow: 6,
    exitButtonText: 'Thoát',
    dividerColor1: '#ffffff',
    dividerColor2: '#facc15',
    activityLearnLabel: 'Học từ vựng',
    activityLearnDesc: 'Xem lại danh sách từ của bài',
    activityMatchLabel: 'Trò chơi Ghép cặp',
    activityMatchDesc: 'Nối từ tiếng Anh với nghĩa Việt',
    activitySpellLabel: 'Trò chơi Viết Chính tả',
    activitySpellDesc: 'Viết từ tiếng Anh tương ứng',
    activityQuizLabel: 'Làm bài trắc nghiệm',
    activityQuizDesc: 'Kiểm tra kiến thức của bạn',
    quizDuration: 30,
    quizTimerEnabled: true,
    spellingDuration: 30,
    spellingTimerEnabled: true,
    matchingDuration: 20,
    matchingTimerEnabled: true,
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Welcome);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | 'topics' | null>(null);
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseSelectionConfig>(DEFAULT_EXERCISE_CONFIG);

  useEffect(() => {
    const unsub = listenToExerciseSelectionConfig(FIXED_CLASSROOM_ID, (config) => {
      if (config) setExerciseConfig({ ...DEFAULT_EXERCISE_CONFIG, ...config });
    });
    return () => unsub();
  }, []);

  const handleLogin = useCallback((player: PlayerData) => {
    setPlayerData(player);
    setCurrentScreen(Screen.ExerciseTypeSelection);
  }, []);

  useEffect(() => {
    const isTeacherLoggedIn = sessionStorage.getItem('teacherLoggedIn-APP_2');
    if (isTeacherLoggedIn === 'true') {
      setCurrentScreen(Screen.Dashboard);
      setClassroomId(FIXED_CLASSROOM_ID);
    }
  }, []);
  
  const handleStartUnitQuiz = useCallback((unitQuestions: QuizQuestion[], unitNumber: number) => {
    if (!unitQuestions || unitQuestions.length === 0) {
        alert("Lỗi: Không thể bắt đầu bài kiểm tra vì UNIT này chưa có câu hỏi. Vui lòng báo cho giáo viên.");
        return;
    }
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'quiz');
        setCurrentActivityId(activityId);
    }
    setQuestions(unitQuestions);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.Quiz);
  }, [playerData, selectedGrade]);
  
  const handleStartSpellingGame = useCallback((vocabData: VocabularyWord[], unitNumber: number) => {
    if (!vocabData || vocabData.length === 0) {
        alert("Lỗi: Không thể bắt đầu trò chơi vì UNIT này chưa có từ vựng. Vui lòng báo cho giáo viên.");
        return;
    }
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'spelling');
        setCurrentActivityId(activityId);
    }
    setVocabulary(vocabData);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.SpellingGame);
  }, [playerData, selectedGrade]);

  const handleStartMatchingGame = useCallback((vocabData: VocabularyWord[], unitNumber: number) => {
    if (!vocabData || vocabData.length === 0) {
        alert("Lỗi: Không thể bắt đầu trò chơi vì UNIT này chưa có từ vựng. Vui lòng báo cho giáo viên.");
        return;
    }
     if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'matching');
        setCurrentActivityId(activityId);
    }
    setVocabulary(vocabData);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.MatchingGame);
  }, [playerData, selectedGrade]);

  const handleLearnVocabulary = useCallback((vocabData: VocabularyWord[], unitNumber: number) => {
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'vocabulary');
        setCurrentActivityId(activityId);
    }
    setVocabulary(vocabData);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.Vocabulary);
  }, [playerData, selectedGrade]);

  const handleReturnToActivitySelection = useCallback(() => {
    if (currentActivityId && playerData) {
        removeStudentPresence(FIXED_CLASSROOM_ID, playerData.name, playerData.class)
            .catch(err => console.error("Failed to remove student presence on back:", err));
    }
    setGameResult(null);
    setCurrentScreen(Screen.UnitSelection);
    setQuestions([]);
    setVocabulary([]);
    setCurrentActivityId(null);
  }, [currentActivityId, playerData]);

  const handleFinishGame = useCallback((result: GameResult) => {
    setGameResult(result);
    setCurrentScreen(Screen.Results);
  }, []);

  const handleGoHome = useCallback(() => {
    setPlayerData(null);
    setGameResult(null);
    setQuestions([]);
    setVocabulary([]);
    setSelectedUnit(null);
    setSelectedGrade(null);
    setClassroomId(null);
    setCurrentActivityId(null);
    sessionStorage.removeItem('teacherLoggedIn-APP_2');
    setCurrentScreen(Screen.Welcome);
  }, []);
  
  const handleForceExitToWelcome = useCallback(() => {
    setPlayerData(null);
    setGameResult(null);
    setQuestions([]);
    setVocabulary([]);
    setCurrentActivityId(null);
    setSelectedGrade(null);
    setCurrentScreen(Screen.Welcome);
  }, []);

  const handleLogout = useCallback(() => {
    if (playerData) {
      removeStudentPresence(FIXED_CLASSROOM_ID, playerData.name, playerData.class)
        .catch(err => console.error("Failed to remove student presence on logout:", err));
    }
    setPlayerData(null);
    setGameResult(null);
    setQuestions([]);
    setVocabulary([]);
    setCurrentActivityId(null);
    setSelectedGrade(null);
    setCurrentScreen(Screen.LoggedOut);
  }, [playerData]);

  const handleHostRequest = useCallback(() => {
    setIsPasswordModalVisible(true);
  }, []);

  const handlePasswordSubmit = useCallback((password: string) => {
    if (password === TEACHER_PASSWORD) {
        sessionStorage.setItem('teacherLoggedIn-APP_2', 'true');
        setClassroomId(FIXED_CLASSROOM_ID);
        setCurrentScreen(Screen.Dashboard);
        setIsPasswordModalVisible(false);
    } else {
        alert("Mật khẩu không đúng. Vui lòng thử lại.");
    }
  }, []);

  const handleClosePasswordModal = useCallback(() => {
    setIsPasswordModalVisible(false);
  }, []);
  
  const handleUnitSelect = useCallback((unitNumber: number) => {
    setSelectedUnit(unitNumber);
  }, []);

  const handleCloseActivityModal = useCallback(() => {
    setSelectedUnit(null);
  }, []);

  const handleSelectGrade = useCallback((grade: number | 'topics') => {
      setSelectedGrade(grade);
      setCurrentScreen(Screen.UnitSelection);
  }, []);

  const handleBackToGradeSelection = useCallback(() => {
      setSelectedGrade(null);
      setSelectedUnit(null);
      setCurrentScreen(Screen.ExerciseTypeSelection);
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Welcome:
        return <WelcomeScreen onLogin={handleLogin} onHostRequest={handleHostRequest} classroomId={FIXED_CLASSROOM_ID} />;
      case Screen.ExerciseTypeSelection:
        return playerData && <ExerciseTypeSelectionScreen onSelect={handleSelectGrade} onBack={handleGoHome} />;
      case Screen.UnitSelection:
        return playerData && selectedGrade && <UnitSelectionScreen 
            playerData={playerData} 
            grade={selectedGrade}
            onStartQuiz={handleStartUnitQuiz} 
            onLearnVocabulary={handleLearnVocabulary} 
            onStartSpellingGame={handleStartSpellingGame} 
            onStartMatchingGame={handleStartMatchingGame} 
            onBack={handleBackToGradeSelection} 
            classroomId={FIXED_CLASSROOM_ID}
            selectedUnit={selectedUnit}
            onUnitSelect={handleUnitSelect}
            onCloseActivityModal={handleCloseActivityModal}
        />;
      case Screen.Quiz:
        return playerData && selectedUnit && currentActivityId && selectedGrade && <QuizScreen playerData={playerData} questions={questions} unitNumber={selectedUnit} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} durationSeconds={exerciseConfig.quizTimerEnabled ? (exerciseConfig.quizDuration * 60) : 0} />;
      case Screen.SpellingGame:
        return playerData && selectedUnit && currentActivityId && selectedGrade && <SpellingGameScreen vocabulary={vocabulary} unitNumber={selectedUnit} playerData={playerData} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} durationSeconds={exerciseConfig.spellingTimerEnabled ? (exerciseConfig.spellingDuration * 60) : 0} />;
      case Screen.MatchingGame:
        return playerData && selectedUnit && currentActivityId && selectedGrade && <MatchingGameScreen vocabulary={vocabulary} unitNumber={selectedUnit} playerData={playerData} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} durationSeconds={exerciseConfig.matchingTimerEnabled ? (exerciseConfig.matchingDuration * 60) : 0} />;
      case Screen.Vocabulary:
        return playerData && selectedUnit && selectedGrade && currentActivityId && <VocabularyScreen unitNumber={selectedUnit} vocabulary={vocabulary} onBack={handleReturnToActivitySelection} classroomId={FIXED_CLASSROOM_ID} grade={selectedGrade} playerData={playerData} activityId={currentActivityId} onFinish={handleFinishGame} />;
      case Screen.Results:
        return gameResult && <ResultsScreen result={gameResult} onBack={handleReturnToActivitySelection} onLogout={handleLogout} isClassroomMode={true} />;
      case Screen.Dashboard:
        return classroomId && <TeacherDashboard classroomId={classroomId} onGoHome={handleGoHome} />;
      case Screen.LoggedOut:
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[600px] bg-gray-100">
                <h1 className="text-3xl font-bold text-gray-800">Bạn đã đăng xuất thành công.</h1>
                <p className="text-gray-600 mt-2">Cảm ơn bạn đã tham gia. Bây giờ bạn có thể đóng cửa sổ này.</p>
            </div>
        );
      default:
        return <WelcomeScreen onLogin={handleLogin} onHostRequest={handleHostRequest} classroomId={FIXED_CLASSROOM_ID} />;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto bg-transparent rounded-2xl shadow-2xl overflow-hidden relative">
        {renderScreen()}
        <PasswordModal 
            show={isPasswordModalVisible}
            onClose={handleClosePasswordModal}
            onSubmit={handlePasswordSubmit}
        />
      </div>
    </div>
  );
};

export default App;
