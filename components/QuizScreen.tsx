
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerData, QuizQuestion, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateStudentProgress, updateUnitActivityProgress } from '../services/firebaseService';

const QUIZ_DURATION_SECONDS = 30 * 60; // 30 minutes

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
}

const QuizScreen: React.FC<QuizScreenProps> = ({ playerData, questions, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION_SECONDS);
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
        const timer = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); finishQuiz(); return 0; } return prev - 1; }); }, 1000);
        return () => clearInterval(timer);
    }, [finishQuiz]);

    if (!currentQuestion) return null;

    const handleAnswerSelect = (answer: string) => { if (!isAnswered) setSelectedAnswer(answer); }
    const handleCheckAnswer = () => {
        if (!selectedAnswer) { setFeedback({ message: "Vui lòng chọn một đáp án!", isCorrect: false }); setTimeout(() => setFeedback(null), 3000); return; }
        setIsAnswered(true);
        const isCorrect = selectedAnswer === currentQuestion.answer;
        if(isCorrect) { setScore(prev => prev + pointsPerQuestion); playCorrectSound(); } else playIncorrectSound();
        setQuizDetails(prev => [...prev, { question: currentQuestion.sentence, translation: currentQuestion.translation, options: currentQuestion.options, userAnswer: selectedAnswer, correctAnswer: currentQuestion.answer, status: isCorrect ? 'correct' : 'incorrect', explanation: currentQuestion.explanation }]);
    }
    const handleNextQuestion = () => { if(currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); setSelectedAnswer(null); setIsAnswered(false); } else finishQuiz(); }
    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
        <div className="flex flex-col items-center px-4 py-4 relative min-h-[600px] bg-orange-50">
             {feedback && <div className={`fixed top-5 right-5 shadow-lg rounded-lg p-4 text-center z-50 ${feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><p className="font-bold">{feedback.message}</p></div>}
            <div className="w-full max-w-3xl mx-auto p-2 flex justify-between items-center bg-amber-50 rounded-xl mb-4 border border-amber-200 shadow-sm">
                <button onClick={handleExitPrematurely} className="group flex items-center text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors focus:outline-none rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span className="border-b-2 border-current pb-0.5">Back</span>
                </button>
                <div className="bg-red-500 text-white font-bold py-0.5 px-2 rounded-lg shadow-md flex items-baseline"><span className="text-sm">Điểm:&nbsp;</span><span className="text-sm font-black font-['Nunito']">{score.toFixed(1)}</span></div>
                <p className="text-base font-bold text-red-600 text-center font-['Nunito']">{`#${currentQuestionIndex + 1} / ${questions.length}`}</p>
                <div className="bg-purple-800 text-white font-bold py-0.5 px-2 rounded-lg shadow-md"><span className="text-base font-black font-['Nunito']">{formatTime(timeLeft)}</span></div>
            </div>
            <div className="flex flex-col items-center w-full flex-grow">
                <div className="w-full max-w-3xl bg-white rounded-2xl border-4 border-green-500 px-2 py-4 shadow-lg flex flex-col flex-grow">
                    <p className="text-lg font-bold text-blue-900 mb-6 min-h-[56px] text-left">{currentQuestion.sentence.replace('______', '-----')}</p>
                    <div className="flex-grow"></div><div className="w-full border-t-4 border-red-500 mb-4"></div>
                    <div className="grid grid-cols-1 gap-3 w-full">
                        {currentQuestion.options.map((option, i) => {
                            let btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-blue-100 border-blue-400 text-blue-800 hover:bg-orange-500 hover:text-white';
                            if (isAnswered) {
                                btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed';
                                if (option === currentQuestion.answer) btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-green-50 text-green-700 border-green-500 cursor-not-allowed';
                                else if (option === selectedAnswer) btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-red-50 text-red-700 border-red-500 cursor-not-allowed';
                            } else if (option === selectedAnswer) btnClass = 'p-3 rounded-lg text-left font-semibold text-base border-2 focus:outline-none transition bg-orange-500 text-white border-orange-600';
                            return (<button key={i} onClick={() => handleAnswerSelect(option)} disabled={isAnswered} className={btnClass}><span className="font-bold mr-2 font-['Nunito']">{optionLabels[i]}.</span><span dangerouslySetInnerHTML={{ __html: option }} /></button>)
                        })}
                    </div>
                    <div className="mt-4 flex justify-center space-x-4">
                         {!isAnswered ? <button onClick={handleCheckAnswer} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full text-lg hover:bg-blue-700 transition" disabled={!selectedAnswer}>Check Answer</button> : <button onClick={handleNextQuestion} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-full text-lg hover:bg-amber-600 transition">{currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizScreen;
