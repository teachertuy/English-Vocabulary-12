

import React, { useState, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import TeacherDashboard from './components/TeacherDashboard';
import PasswordModal from './components/PasswordModal';
import { PlayerData, QuizQuestion, GameResult, VocabularyWord } from './types';
import { FIXED_CLASSROOM_ID, TEACHER_PASSWORD } from './constants';
import { removeStudentPresence, startUnitActivity } from './services/firebaseService';
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

  const handleLogin = useCallback((player: PlayerData) => {
    setPlayerData(player);
    setCurrentScreen(Screen.ExerciseTypeSelection);
  }, []);

  useEffect(() => {
    const isTeacherLoggedIn = sessionStorage.getItem('teacherLoggedIn');
    if (isTeacherLoggedIn === 'true') {
      setCurrentScreen(Screen.Dashboard);
      setClassroomId(FIXED_CLASSROOM_ID);
    }
  }, []);
  
  const handleStartUnitQuiz = useCallback(async (unitQuestions: QuizQuestion[], unitNumber: number) => {
    if (!unitQuestions || unitQuestions.length === 0) {
        alert("Lỗi: Không thể bắt đầu bài kiểm tra vì UNIT này chưa có câu hỏi. Vui lòng báo cho giáo viên.");
        return;
    }
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = await startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'quiz');
        setCurrentActivityId(activityId);
    }
    setQuestions(unitQuestions);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.Quiz);
  }, [playerData, selectedGrade]);
  
  const handleStartSpellingGame = useCallback(async (vocabData: VocabularyWord[], unitNumber: number) => {
    if (!vocabData || vocabData.length === 0) {
        alert("Lỗi: Không thể bắt đầu trò chơi vì UNIT này chưa có từ vựng. Vui lòng báo cho giáo viên.");
        return;
    }
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = await startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'spelling');
        setCurrentActivityId(activityId);
    }
    setVocabulary(vocabData);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.SpellingGame);
  }, [playerData, selectedGrade]);

  const handleStartMatchingGame = useCallback(async (vocabData: VocabularyWord[], unitNumber: number) => {
    if (!vocabData || vocabData.length === 0) {
        alert("Lỗi: Không thể bắt đầu trò chơi vì UNIT này chưa có từ vựng. Vui lòng báo cho giáo viên.");
        return;
    }
     if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const activityId = await startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'matching');
        setCurrentActivityId(activityId);
    }
    setVocabulary(vocabData);
    setSelectedUnit(unitNumber);
    setCurrentScreen(Screen.MatchingGame);
  }, [playerData, selectedGrade]);

  const handleLearnVocabulary = useCallback(async (vocabData: VocabularyWord[], unitNumber: number) => {
    if (playerData && selectedGrade) {
        const unitIdentifier = selectedGrade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        await startUnitActivity(FIXED_CLASSROOM_ID, selectedGrade, unitIdentifier, playerData, 'vocabulary');
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
    // Note: selectedUnit is NOT reset, so the modal for that unit will open.
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
    sessionStorage.removeItem('teacherLoggedIn');
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
        sessionStorage.setItem('teacherLoggedIn', 'true');
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
        return playerData && selectedUnit && currentActivityId && selectedGrade && <QuizScreen playerData={playerData} questions={questions} unitNumber={selectedUnit} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} />;
      case Screen.SpellingGame:
        return playerData && selectedUnit && currentActivityId && selectedGrade && <SpellingGameScreen vocabulary={vocabulary} unitNumber={selectedUnit} playerData={playerData} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} />;
      case Screen.MatchingGame:
        return playerData && selectedUnit && currentActivityId && selectedGrade && <MatchingGameScreen vocabulary={vocabulary} unitNumber={selectedUnit} playerData={playerData} onFinish={handleFinishGame} onForceExit={handleForceExitToWelcome} classroomId={FIXED_CLASSROOM_ID} activityId={currentActivityId} onBack={handleReturnToActivitySelection} grade={selectedGrade} />;
      case Screen.Vocabulary:
        return selectedUnit && selectedGrade && <VocabularyScreen unitNumber={selectedUnit} vocabulary={vocabulary} onBack={handleReturnToActivitySelection} classroomId={FIXED_CLASSROOM_ID} grade={selectedGrade} />;
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