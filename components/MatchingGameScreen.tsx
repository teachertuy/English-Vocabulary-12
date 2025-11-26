
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const tagColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-600', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-lime-500', 'bg-cyan-500', 'bg-emerald-500'
];

const getTagColor = (word: string) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
        hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % tagColors.length);
    return tagColors[index];
};

interface MatchingGameScreenProps {
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

const MatchingGameScreen: React.FC<MatchingGameScreenProps> = ({ playerData, vocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack }) => {
    const [remainingWords, setRemainingWords] = useState<VocabularyWord[]>([]);
    const [currentVietnamese, setCurrentVietnamese] = useState<VocabularyWord | null>(null);
    const [selectedEnglish, setSelectedEnglish] = useState<VocabularyWord | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
    const [gameDetails, setGameDetails] = useState<QuizAnswerDetail[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    
    const startTime = useMemo(() => Date.now(), []);
    const incorrectMatches = useMemo(() => gameDetails.filter(d => d.status === 'incorrect').length, [gameDetails]);
    
    useEffect(() => {
        const initialWords = shuffleArray(vocabulary);
        setRemainingWords(initialWords);
        if (initialWords.length > 0) {
            setCurrentVietnamese(initialWords[Math.floor(Math.random() * initialWords.length)]);
        }
    }, [vocabulary]);

    const finishGame = useCallback(async (forceExit = false) => {
        if (isGameOver) return;
        setIsGameOver(true);
        
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const answeredCount = gameDetails.length;
        
        const finalResultData: Partial<GameResult> = {
            score: ((score / vocabulary.length) * 10).toFixed(1),
            correct: score,
            incorrect: answeredCount - score,
            answered: answeredCount,
            totalQuestions: vocabulary.length,
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
            gameType: 'matching',
            ...finalResultData
        } as GameResult;

        if (forceExit) onForceExit();
        else onFinish(fullResultForDisplay);

    }, [isGameOver, startTime, gameDetails, playerData, vocabulary.length, unitNumber, grade, onFinish, onForceExit, classroomId, score, activityId]);

    const handleCheckAnswer = () => {
        if (!selectedEnglish || !currentVietnamese) {
            setFeedback("Vui lòng chọn một từ tiếng Anh!");
            setTimeout(() => setFeedback(null), 2000);
            return;
        }

        const isCorrect = selectedEnglish.word === currentVietnamese.word;

        setGameDetails(prev => [...prev, {
            question: `Nghĩa của "${currentVietnamese.translation}" là gì?`,
            translation: '',
            options: [],
            userAnswer: selectedEnglish.word,
            correctAnswer: currentVietnamese.word,
            status: isCorrect ? 'correct' : 'incorrect',
            explanation: `Từ "${currentVietnamese.word}" có nghĩa là "${currentVietnamese.translation}".`
        }]);

        let nextWords = remainingWords;
        if (isCorrect) {
            playCorrectSound();
            setScore(prev => prev + 1);
            nextWords = remainingWords.filter(w => w.word !== currentVietnamese.word);
            setRemainingWords(nextWords);
        } else {
            playIncorrectSound();
        }

        setSelectedEnglish(null);

        if (nextWords.length > 0) {
            // Pick a new random word that is different from the current one if possible
            let newWord = currentVietnamese;
            if (nextWords.length > 1) {
                const availableWords = nextWords.filter(w => w.word !== currentVietnamese.word);
                newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            } else {
                newWord = nextWords[0];
            }
            setCurrentVietnamese(newWord);
        } else {
            finishGame();
        }
    };
    
    // --- Lifecycle and Listeners ---
    useEffect(() => { if (classroomId) trackStudentPresence(classroomId, playerData.name, playerData.class); const timer = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); finishGame(); return 0; } return prev - 1; }); }, 1000); return () => clearInterval(timer); }, [finishGame, classroomId, playerData.name, playerData.class]);
    useEffect(() => { if (classroomId) { const u = getGameStatus(classroomId, i => !i && finishGame(true)); return () => u(); } }, [classroomId, finishGame]);
    useEffect(() => { if (classroomId) { const u = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishGame(true)); return () => u(); } }, [classroomId, playerData.name, playerData.class, finishGame]);
    useEffect(() => { const h = () => document.hidden && classroomId && incrementCheatCount(classroomId, playerData.name, playerData.class); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [classroomId, playerData.name, playerData.class]);

    const shuffledRemainingWords = useMemo(() => shuffleArray(remainingWords), [remainingWords]);
    const splitIndex = Math.ceil(shuffledRemainingWords.length / 2);
    const topWords = shuffledRemainingWords.slice(0, splitIndex);
    const bottomWords = shuffledRemainingWords.slice(splitIndex);

    const WordButtons = ({ words }: { words: VocabularyWord[] }) => (
        <div className="flex flex-wrap justify-center gap-2 p-2 max-w-5xl">
            {words.map(v => {
                const isSelected = selectedEnglish?.word === v.word;
                return (
                    <button 
                        key={v.word} 
                        onClick={() => setSelectedEnglish(v)}
                        className={`px-4 py-2 text-base font-bold rounded-full text-white cursor-pointer transition transform hover:scale-110 ${getTagColor(v.word)} ${isSelected ? 'ring-4 ring-offset-2 ring-yellow-400' : ''}`}
                    >
                        {v.word}
                    </button>
                )
            })}
        </div>
    );
    
    return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white min-h-[600px] relative w-full">
            {feedback && (
                <div className="fixed top-5 right-5 shadow-lg rounded-lg p-4 text-center z-50 bg-red-100 text-red-800 transition-transform transform">
                    <p className="font-bold">{feedback}</p>
                </div>
            )}
            <div className="w-full max-w-5xl mx-auto mb-4">
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="group flex items-center text-blue-600 font-bold text-lg hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="border-b-2 border-current pb-0.5">Back</span>
                    </button>

                    <div className="bg-gray-50 px-2 py-0.5 rounded-lg shadow-lg border-2 border-indigo-400 flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">Kết quả:</span>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg font-black text-green-600 w-8 text-center">{score}</span>
                        </div>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lg font-black text-red-600 w-8 text-center">{incorrectMatches}</span>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 px-2 py-0.5 rounded-lg shadow-lg border-2 border-red-400 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-black text-red-700 tracking-wider" style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl my-2">
                <div className="border-t-2 border-black"></div>
                <div className="border-t-2 border-gray-400 mt-1"></div>
            </div>

            <WordButtons words={topWords} />

            <div className="flex flex-col items-center justify-center flex-grow w-full my-4">
                 <div className="w-full max-w-2xl">
                    <div className="bg-black rounded-2xl p-1 shadow-2xl">
                        <div className="bg-white rounded-[14px] p-1">
                            <div className="bg-black rounded-[12px] p-1">
                                <div className="bg-white rounded-[10px]">
                                    <div className="p-6 text-center flex flex-col items-center">
                                        <div className="w-full pb-4 min-h-[5rem] flex items-center justify-center">
                                            <p className="text-orange-600 font-extrabold text-4xl leading-tight text-center">{currentVietnamese?.translation}</p>
                                        </div>
                                        
                                        <div className="w-11/12 border-b-2 border-gray-300 mb-4"></div>
    
                                        <div className="w-full mb-6 min-h-[5rem] flex items-center justify-center">
                                            <div className="w-full h-full border-2 border-dashed border-black rounded-xl flex items-center justify-center p-4">
                                                <p className={`font-bold text-3xl transition-colors ${selectedEnglish ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {selectedEnglish ? selectedEnglish.word : '...'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleCheckAnswer} className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md">
                                            Check answer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            <WordButtons words={bottomWords} />

            {remainingWords.length === 1 && (
                <button onClick={() => finishGame(false)} className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold py-2 px-6 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-gray-500 absolute bottom-6 text-sm">
                    Finish Quiz
                </button>
            )}
        </div>
    );
};

export default MatchingGameScreen;
