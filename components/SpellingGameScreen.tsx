
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence } from '../services/firebaseService';

const GAME_DURATION_SECONDS = 20 * 60; // 20 minutes

declare const Tone: any;

const synth = typeof Tone !== 'undefined' ? new Tone.Synth().toDestination() : null;
const incorrectSynth = typeof Tone !== 'undefined' ? new Tone.FMSynth({
    harmonicity: 5, modulationIndex: 10, oscillator: { type: "sine" },
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
    incorrectSynth.triggerAttackRelease("G#5", "1s");
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

interface SpellingGameScreenProps {
  playerData: PlayerData;
  vocabulary: VocabularyWord[];
  unitNumber: number;
  grade: number | 'topics';
  onFinish: (result: GameResult) => void;
  onForceExit: () => void;
  classroomId: string | null;
  activityId: string;
  onBack: () => void;
}

const SpellingGameScreen: React.FC<SpellingGameScreenProps> = ({ playerData, vocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
    const [userInput, setUserInput] = useState('');
    const [gameDetails, setGameDetails] = useState<QuizAnswerDetail[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [inputStatus, setInputStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);
    
    const startTime = useMemo(() => Date.now(), []);
    const shuffledVocabulary = useMemo(() => shuffleArray(vocabulary), [vocabulary]);
    
    const currentWord = shuffledVocabulary[currentIndex];
    const incorrectAnswers = useMemo(() => gameDetails.filter(d => d.status === 'incorrect').length, [gameDetails]);


    // --- Core Game Logic ---
    const finishGame = useCallback(async (forceExit = false) => {
        if (isGameOver) return;
        setIsGameOver(true);
        
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const answeredCount = gameDetails.length;
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        
        const finalResultData: Partial<GameResult> = {
            score: ((correctCount / shuffledVocabulary.length) * 10).toFixed(1),
            correct: correctCount,
            incorrect: answeredCount - correctCount,
            answered: answeredCount,
            totalQuestions: shuffledVocabulary.length,
            timeTakenSeconds,
            details: gameDetails,
        };
        
        if (classroomId && activityId) {
            try {
                const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
                await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, finalResultData);
                await removeStudentPresence(classroomId, playerData.name, playerData.class);
            } catch (error) {
                console.error("Firebase submission failed:", error);
            }
        }
        
        const fullResultForDisplay: GameResult = {
            playerName: playerData.name,
            playerClass: playerData.class,
            gameType: 'spelling',
            ...finalResultData
        } as GameResult;

        if (forceExit) onForceExit();
        else onFinish(fullResultForDisplay);

    }, [isGameOver, startTime, gameDetails, playerData, shuffledVocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId]);
    
    const handleNextWord = useCallback(() => {
        if (currentIndex < shuffledVocabulary.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setIsChecking(false);
            setInputStatus('idle');
        } else {
            finishGame();
        }
    }, [currentIndex, shuffledVocabulary.length, finishGame]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [currentIndex]);

    const handleCheckAnswer = () => {
        if (!userInput.trim() || isChecking) return;
        setIsChecking(true);
        
        const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
        
        setGameDetails(prev => [...prev, {
            question: currentWord.translation,
            translation: currentWord.word,
            options: [],
            userAnswer: userInput.trim(),
            correctAnswer: currentWord.word,
            status: isCorrect ? 'correct' : 'incorrect',
            explanation: `Từ "${currentWord.word}" (${currentWord.type}) có phiên âm /${currentWord.phonetic}/.`
        }]);

        if (isCorrect) {
            playCorrectSound();
            setCorrectAnswers(prev => prev + 1);
            setInputStatus('correct');
        } else {
            playIncorrectSound();
            setInputStatus('incorrect');
        }

        setTimeout(handleNextWord, 1200);
    };

    // --- Lifecycle and Listeners ---
    useEffect(() => {
        if (classroomId) trackStudentPresence(classroomId, playerData.name, playerData.class);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [finishGame, classroomId, playerData.name, playerData.class]);

    useEffect(() => { if (classroomId) { const u = getGameStatus(classroomId, i => !i && finishGame(true)); return () => u(); } }, [classroomId, finishGame]);
    useEffect(() => { if (classroomId) { const u = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishGame(true)); return () => u(); } }, [classroomId, playerData.name, playerData.class, finishGame]);
    useEffect(() => { const h = () => document.hidden && classroomId && incrementCheatCount(classroomId, playerData.name, playerData.class); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [classroomId, playerData.name, playerData.class]);

    let inputClasses = "w-full text-center text-4xl font-bold bg-white rounded-lg py-5 pl-24 pr-4 focus:outline-none transition-all duration-300 border-2 border-gray-300 focus:ring-4 focus:ring-blue-300";
    if (inputStatus === 'correct') inputClasses = "w-full text-center text-4xl font-bold bg-green-50 text-green-700 rounded-lg py-5 pl-24 pr-4 focus:outline-none transition-all duration-300 border-4 border-green-500 ring-4 ring-green-200";
    if (inputStatus === 'incorrect') inputClasses = "w-full text-center text-4xl font-bold bg-red-50 text-red-700 rounded-lg py-5 pl-24 pr-4 focus:outline-none transition-all duration-300 border-4 border-red-500 ring-4 ring-red-200";
    
    return (
        <div className="flex flex-col items-center p-4 sm:p-6 bg-white min-h-[600px] relative">
            <div className="w-full max-w-4xl mx-auto flex justify-between items-center mb-6">
                <button onClick={onBack} className="group flex items-center text-blue-600 font-bold text-lg hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="border-b-2 border-current pb-0.5">Back</span>
                </button>

                <div className="flex items-center gap-4">
                    <div title="Từ đang làm" className="flex items-center gap-1.5 bg-white text-gray-700 font-bold px-3 py-1 rounded-full text-sm border-2 border-gray-300 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="font-extrabold text-blue-600 text-base">{currentIndex + 1}</span>
                        <span className="text-gray-500 text-base">/{shuffledVocabulary.length}</span>
                    </div>

                    <div title="Kết quả Đúng / Sai" className="flex items-center gap-3 bg-white px-3 py-1 rounded-full text-sm border-2 border-gray-300 shadow-sm">
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="font-black text-green-600 w-6 text-center text-base">{correctAnswers}</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="font-black text-red-600 w-6 text-center text-base">{incorrectAnswers}</span>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-1.5 bg-white text-red-700 font-bold px-3 py-1 rounded-full text-sm border-2 border-red-300 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base font-black tracking-wider" style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(timeLeft)}</span>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow w-full max-w-xl">
                <p className="text-gray-600 text-xl mb-2">Hãy viết từ/cụm từ tiếng Anh tương ứng:</p>
                <p className="text-orange-500 font-extrabold text-6xl mb-8 text-center">{currentWord?.translation}</p>
                
                <form onSubmit={(e) => { e.preventDefault(); handleCheckAnswer(); }} className="w-full space-y-6 flex flex-col items-center">
                    <div className="w-full relative">
                         <span 
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-5xl sm:text-6xl pointing-finger"
                            aria-hidden="true"
                            style={{ top: 'calc(50% - 2px)' }}
                        >
                            👉
                        </span>
                        <input 
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Viết vào đây"
                            className={inputClasses}
                            disabled={isChecking}
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                    </div>

                    <button type="submit" className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold py-3 px-12 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md text-xl" disabled={isChecking || !userInput.trim()}>
                        Check answer
                    </button>
                </form>
            </div>

            <button onClick={() => finishGame(false)} className="bg-gradient-to-br from-green-500 to-teal-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-green-300 absolute bottom-6">
                Finish Quiz
            </button>
        </div>
    );
};

export default SpellingGameScreen;
