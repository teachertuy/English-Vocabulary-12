
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerData, QuizQuestion, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateStudentProgress, updateUnitActivityProgress } from '../services/firebaseService';

declare const Tone: any;

const synth = typeof Tone !== 'undefined' ? new Tone.Synth().toDestination() : null;
const incorrectSynth = typeof Tone !== 'undefined' ? new Tone.FMSynth({
    harmonicity: 5,
    modulationIndex: 10,
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.4 },
    modulation: { type: "square" },
    modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.4 }
}).toDestination() : null;

function playCorrectSound() {
    if (!synth) return;
    Tone.start();
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "8n", now);
    synth.triggerAttackRelease("G5", "8n", now + 0.2);
}

function playIncorrectSound() {
    if (!incorrectSynth) return;
    Tone.start();
    incorrectSynth.triggerAttackRelease("G#5", "2s");
}


const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface QuizScreenProps {
  playerData: PlayerData;
  questions: QuizQuestion[];
  unitNumber: number;
  grade: number | 'topics';
  onFinish: (result: GameResult) => void;
  onForceExit: () => void;
  classroomId: string | null;
  activityId: string;
  onBack: () => void;
  durationSeconds: number;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ playerData, questions, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack, durationSeconds }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    // Nếu durationSeconds = 0 thì timeLeft sẽ không có ý nghĩa, ta dùng 1 giá trị tượng trưng hoặc logic riêng
    const [timeLeft, setTimeLeft] = useState(durationSeconds > 0 ? durationSeconds : 0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [quizDetails, setQuizDetails] = useState<QuizAnswerDetail[]>([]);
    const [feedback, setFeedback] = useState<{ message: string, isCorrect: boolean } | null>(null);
    const [isQuizOver, setIsQuizOver] = useState(false);
    const startTime = useMemo(() => Date.now(), []);

    const pointsPerQuestion = useMemo(() => {
        return questions.length > 0 ? 10 / questions.length : 0;
    }, [questions.length]);

    useEffect(() => {
        if (classroomId && playerData.name) {
            trackStudentPresence(classroomId, playerData.name, playerData.class);
        }
    }, [classroomId, playerData.name, playerData.class]);

    useEffect(() => {
        if (!classroomId || quizDetails.length === 0) return;
        const correctCount = quizDetails.filter(d => d.status === 'correct').length;
        const incorrectCount = quizDetails.filter(d => d.status === 'incorrect').length;
        updateStudentProgress(classroomId, playerData.name, playerData.class, correctCount, incorrectCount).catch(console.error);
        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const progressData = { score: score.toFixed(1), correct: correctCount, incorrect: incorrectCount, answered: quizDetails.length, totalQuestions: questions.length, details: quizDetails };
        updateUnitActivityProgress(classroomId, grade, unitIdentifier, playerData, activityId, progressData).catch(console.error);
    }, [quizDetails, classroomId, playerData, questions.length, score, grade, unitNumber, activityId]);

    const handleExitPrematurely = async () => {
        if (isQuizOver) return;
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const correctCount = quizDetails.filter(d => d.status === 'correct').length;
        const resultData: Partial<GameResult> = {
            score: score.toFixed(1),
            correct: correctCount,
            incorrect: quizDetails.length - correctCount,
            answered: quizDetails.length,
            totalQuestions: questions.length,
            timeTakenSeconds: timeTakenSeconds,
            details: quizDetails,
        };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, resultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        onBack();
    };

    const finishQuiz = useCallback(async (forceExit = false) => {
        if (isQuizOver) return;
        setIsQuizOver(true);
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const allDetails = questions.map((q) => {
            const answeredDetail = quizDetails.find(d => d.question === q.sentence);
            if (answeredDetail) return answeredDetail;
            return { question: q.sentence, translation: q.translation, options: q.options, userAnswer: null, correctAnswer: q.answer, status: null, explanation: q.explanation };
        });
        const correctAnswersCount = quizDetails.filter(d => d.status === 'correct').length;
        const finalResultData: Partial<GameResult> = { score: score.toFixed(1), correct: correctAnswersCount, incorrect: quizDetails.length - correctAnswersCount, answered: quizDetails.length, totalQuestions: questions.length, timeTakenSeconds, details: allDetails };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, finalResultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        const fullResult: GameResult = { playerName: playerData.name, playerClass: playerData.class, gameType: 'quiz', ...finalResultData } as GameResult;
        if (forceExit) onForceExit(); else onFinish(fullResult);
    }, [isQuizOver, startTime, score, quizDetails, playerData, questions, unitNumber, grade, onFinish, onForceExit, classroomId, activityId]);
    
    useEffect(() => {
        if (!classroomId) return;
        const unsubscribe = getGameStatus(classroomId, (isEnabled) => { if (!isEnabled) finishQuiz(true); });
        return () => unsubscribe();
    }, [classroomId, finishQuiz]);

    useEffect(() => {
        if (!classroomId) return;
        const unsubscribe = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishQuiz(true));
        return () => unsubscribe();
    }, [classroomId, playerData.name, playerData.class, finishQuiz]);

    useEffect(() => {
        const handleVisibilityChange = () => { if (document.hidden && classroomId) incrementCheatCount(classroomId, playerData.name, playerData.class); };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [classroomId, playerData.name, playerData.class]);

    const currentQuestion = questions?.[currentQuestionIndex];
    
    useEffect(() => {
        // Chỉ chạy timer nếu durationSeconds > 0
        if (durationSeconds <= 0) return;

        const timer = setInterval(() => { 
            setTimeLeft(prev => { 
                if (prev <= 1) { 
                    clearInterval(timer); 
                    finishQuiz(); 
                    return 0; 
                } 
                return prev - 1; 
            }); 
        }, 1000);
        return () => clearInterval(timer);
    }, [finishQuiz, durationSeconds]);

    if (!currentQuestion) return null;

    const handleAnswerSelect = (answer: string) => { if (!isAnswered) setSelectedAnswer(answer); }
    const handleCheckAnswer = () => {
        if (!selectedAnswer) return;
        setIsAnswered(true);
        const isCorrect = selectedAnswer === currentQuestion.answer;
        if(isCorrect) { setScore(prev => prev + pointsPerQuestion); playCorrectSound(); } else playIncorrectSound();
        setQuizDetails(prev => [...prev, { question: currentQuestion.sentence, translation: currentQuestion.translation, options: currentQuestion.options, userAnswer: selectedAnswer, correctAnswer: currentQuestion.answer, status: isCorrect ? 'correct' : 'incorrect', explanation: currentQuestion.explanation }]);
    }
    const handleNextQuestion = () => { if(currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); setSelectedAnswer(null); setIsAnswered(false); } else finishQuiz(); }
    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
        <div className="flex flex-col items-center px-4 py-4 relative min-h-[600px] bg-orange-50 w-full">
             {feedback && <div className={`fixed top-5 right-5 shadow-lg rounded-lg p-4 text-center z-50 ${feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><p className="font-bold">{feedback.message}</p></div>}
            
            <div className="w-full max-w-4xl mx-auto p-2 flex justify-between items-center bg-amber-50 rounded-xl mb-4 border border-amber-200 shadow-sm pt-2">
                {/* Back button */}
                <button onClick={handleExitPrematurely} className="group flex items-center text-blue-600 font-extrabold text-lg hover:text-blue-800 transition-colors focus:outline-none rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span className="border-b-2 border-current pb-0.5">Back</span>
                </button>

                {/* Central stacked indicators */}
                <div className="flex flex-col items-center gap-1.5">
                    {/* Score Indicator (Top) */}
                    <div className="bg-red-500 text-white font-bold py-1 px-4 rounded-full shadow-md flex items-center justify-center">
                        <span className="text-sm mr-1 opacity-90">Điểm:</span>
                        <span className="text-xl font-black font-['Nunito']">{score.toFixed(1)}</span>
                    </div>

                    {/* Progress Indicator (Bottom) */}
                    <div className="bg-white px-4 py-0.5 rounded-2xl border border-gray-200 flex items-center shadow-sm min-w-[80px] justify-center">
                        <span className="text-red-600 text-sm font-black font-['Nunito']">{currentQuestionIndex + 1} / {questions.length}</span>
                    </div>
                </div>

                {/* Timer Indicator - Only show if durationSeconds > 0 */}
                {durationSeconds > 0 ? (
                    <div className="bg-purple-800 text-white font-bold py-1.5 px-4 rounded-lg shadow-md">
                        <span className="text-lg font-black font-['Nunito']">{formatTime(timeLeft)}</span>
                    </div>
                ) : (
                    <div className="bg-green-600 text-white font-bold py-1.5 px-4 rounded-lg shadow-md flex items-center gap-1">
                        <span className="text-[12px] opacity-80">TIME:</span>
                        <span className="text-lg font-black font-['Nunito']">∞</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center w-full flex-grow">
                <div className="w-full max-w-3xl bg-white rounded-2xl border-4 border-green-500 px-2 py-4 shadow-lg flex flex-col flex-grow">
                    <p className="text-lg font-bold text-blue-900 mb-6 min-h-[56px] text-left">{currentQuestion.sentence.replace('______', '-----')}</p>
                    <div className="flex-grow"></div><div className="w-full border-t-4 border-red-500 mb-4"></div>
                    <div className="grid grid-cols-1 gap-3 w-full">
                        {currentQuestion.options.map((option, i) => {
                            let btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-blue-100 border-blue-400 text-blue-800 hover:bg-orange-500 hover:text-white';
                            
                            if (isAnswered) {
                                if (option === currentQuestion.answer) {
                                    // Đáp án ĐÚNG: Nền xanh lá rực rỡ
                                    btnClass = 'p-3 rounded-lg text-left font-bold text-base border-2 focus:outline-none transition bg-[#22c55e] text-white border-[#22c55e] cursor-not-allowed shadow-md scale-[1.02]';
                                } else if (option === selectedAnswer) {
                                    // Đáp án SAI: Nền đỏ rực rỡ
                                    btnClass = 'p-3 rounded-lg text-left font-bold text-base border-2 focus:outline-none transition bg-red-600 text-white border-red-600 cursor-not-allowed shadow-md';
                                } else {
                                    // Các đáp án còn lại: Làm mờ đi
                                    btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60';
                                }
                            } else if (option === selectedAnswer) {
                                // Đang chọn (chưa kiểm tra)
                                btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-orange-500 text-white border-orange-600 shadow-md';
                            }

                            return (
                                <button key={i} onClick={() => handleAnswerSelect(option)} disabled={isAnswered} className={btnClass}>
                                    <span className={`font-black mr-2 font-['Nunito'] ${isAnswered && (option === currentQuestion.answer || option === selectedAnswer) ? 'text-white' : 'text-inherit'}`}>
                                        {optionLabels[i]}.
                                    </span>
                                    <span dangerouslySetInnerHTML={{ __html: option }} />
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6 flex justify-center min-h-[64px] items-center">
                         {!isAnswered ? (
                            <button 
                                onClick={handleCheckAnswer} 
                                className={`relative overflow-hidden bg-red-600 text-white font-black py-4 px-10 rounded-full shadow-lg transition-all transform active:scale-95 uppercase tracking-widest min-w-[240px] ring-4 ring-white shadow-[0_0_0_8px_#dc2626] ${!selectedAnswer ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
                            >
                                {/* Snowflakes - Fast and thick */}
                                {selectedAnswer && Array.from({ length: 25 }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="snow-particle" 
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            width: `${2 + Math.random() * 3}px`,
                                            height: `${2 + Math.random() * 3}px`,
                                            animationDuration: `${0.3 + Math.random() * 0.6}s`,
                                            animationDelay: `${Math.random() * 2}s`
                                        }}
                                    />
                                ))}
                                <span className="relative z-10 animate-text-pulse inline-block text-lg">CHECK ANSWER</span>
                            </button>
                         ) : (
                            <button 
                                onClick={handleNextQuestion} 
                                className="bg-amber-500 text-white font-black py-4 px-10 rounded-full text-lg hover:bg-amber-600 transition-all transform hover:scale-105 active:scale-95 shadow-xl min-w-[240px]"
                            >
                                {currentQuestionIndex < questions.length - 1 ? 'NEXT QUESTION' : 'FINISH QUIZ'}
                            </button>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizScreen;
