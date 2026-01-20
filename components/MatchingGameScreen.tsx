import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateStudentProgress, updateUnitActivityProgress } from '../services/firebaseService';

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
        const initialWords = [...vocabulary];
        setRemainingWords(initialWords);
        if (initialWords.length > 0) {
            // Pick a random word for the first Vietnamese prompt
            const shuffledForPrompt = shuffleArray(initialWords);
            setCurrentVietnamese(shuffledForPrompt[0]);
        }
    }, [vocabulary]);

    // Update real-time progress for the teacher dashboard
    useEffect(() => {
        if (!classroomId || gameDetails.length === 0) return;

        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const incorrectCount = gameDetails.filter(d => d.status === 'incorrect').length;
        
        // Update general dashboard progress
        updateStudentProgress(classroomId, playerData.name, playerData.class, correctCount, incorrectCount)
            .catch(err => console.error("Failed to update student progress:", err));

        // Update the unit-specific activity record
        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const currentScore = ((correctCount / vocabulary.length) * 10).toFixed(1);
        const progressData = {
            score: currentScore,
            correct: correctCount,
            incorrect: incorrectCount,
            answered: gameDetails.length,
            totalQuestions: vocabulary.length,
            details: gameDetails
        };
        updateUnitActivityProgress(classroomId, grade, unitIdentifier, playerData, activityId, progressData)
            .catch(err => console.error("Failed to update unit activity progress:", err));

    }, [gameDetails, classroomId, playerData, vocabulary.length, grade, unitNumber, activityId]);

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
            // Pick a new random word for the Vietnamese prompt
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

    // Sorting English words alphabetically for the view as requested
    const sortedRemainingWords = useMemo(() => {
        return [...remainingWords].sort((a, b) => a.word.localeCompare(b.word));
    }, [remainingWords]);

    const splitIndex = Math.ceil(sortedRemainingWords.length / 2);
    const topWords = sortedRemainingWords.slice(0, splitIndex);
    const bottomWords = sortedRemainingWords.slice(splitIndex);

    const WordButtons = ({ words }: { words: VocabularyWord[] }) => (
        <div className="flex flex-wrap justify-center gap-1 p-1 max-w-2xl">
            {words.map(v => {
                const isSelected = selectedEnglish?.word === v.word;
                return (
                    <button 
                        key={v.word} 
                        onClick={() => setSelectedEnglish(v)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg text-white shadow-sm cursor-pointer transition transform hover:scale-105 ${getTagColor(v.word)} ${isSelected ? 'ring-2 ring-offset-1 ring-yellow-400 scale-105' : ''}`}
                    >
                        {v.word}
                    </button>
                )
            })}
        </div>
    );
    
    return (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-white min-h-[500px] relative w-full">
            {feedback && (
                <div className="fixed top-5 right-5 shadow-lg rounded-lg p-3 text-sm text-center z-50 bg-red-100 text-red-800 transition-transform transform">
                    <p className="font-bold">{feedback}</p>
                </div>
            )}
            <div className="w-full max-w-3xl mx-auto mb-2">
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="group flex items-center text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="border-b-2 border-current pb-0.5">Back</span>
                    </button>

                    <div className="bg-gray-50 px-2 py-0.5 rounded-lg shadow-sm border border-indigo-300 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-700 uppercase">Kết quả:</span>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-black text-green-600 w-5 text-center font-['Nunito']">{score}</span>
                        </div>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-black text-red-600 w-5 text-center font-['Nunito']">{incorrectMatches}</span>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 px-2 py-0.5 rounded-lg shadow-sm border border-red-300 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-black text-red-700 tracking-wider font-['Nunito']" style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-2xl my-1">
                <div className="border-t border-black"></div>
                <div className="border-t border-gray-400 mt-0.5"></div>
            </div>

            <WordButtons words={topWords} />

            <div className="flex flex-col items-center justify-center flex-grow w-full my-1">
                 <div className="w-full max-w-[400px]">
                    <div className="bg-black rounded-xl p-0.5 shadow-lg">
                        <div className="bg-white rounded-[10px] p-0.5">
                            <div className="bg-black rounded-[8px] p-0.5">
                                <div className="bg-white rounded-[6px]">
                                    <div className="px-3 py-2 text-center flex flex-col items-center gap-1.5">
                                        <div className="w-full flex items-center justify-center">
                                            <p className="text-orange-600 font-extrabold text-lg sm:text-xl leading-none text-center pb-0.5">{currentVietnamese?.translation}</p>
                                        </div>
                                        
                                        <div className="w-3/4 border-b border-gray-300"></div>
    
                                        <div className="w-full flex items-center justify-center">
                                            <div className="w-full py-1 border border-dashed border-black rounded flex items-center justify-center min-h-[28px]">
                                                <p className={`font-bold text-base transition-colors ${selectedEnglish ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {selectedEnglish ? selectedEnglish.word : '...'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={handleCheckAnswer} 
                                            disabled={!selectedEnglish}
                                            className={`w-full mt-0.5 font-bold py-1 rounded-full shadow-sm transform transition-all duration-300 text-xs focus:outline-none relative overflow-hidden group ${
                                                !selectedEnglish 
                                                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" 
                                                : "text-white border border-gray-600 hover:shadow-lg hover:shadow-white/20 hover:-translate-y-0.5"
                                            }`}
                                            style={selectedEnglish ? {
                                                backgroundColor: '#000000',
                                                backgroundImage: `
                                                    radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 3px),
                                                    radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 2px),
                                                    radial-gradient(white, rgba(255,255,255,.1) 2px, transparent 3px)
                                                `,
                                                backgroundSize: '50px 50px, 30px 30px, 40px 40px',
                                                backgroundPosition: '0 0, 15px 15px, 20px 20px'
                                            } : {}}
                                        >
                                           {selectedEnglish ? (
                                                <div className="relative z-10 flex items-center justify-center gap-1">
                                                    <span className="text-[10px] animate-pulse">✨</span>
                                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 uppercase">CHECK ANSWER</span>
                                                    <span className="text-[10px] animate-pulse delay-75">✨</span>
                                                </div>
                                            ) : (
                                                "CHECK ANSWER"
                                            )}
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
                <button onClick={() => finishGame(false)} className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold py-1.5 px-4 rounded-full shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gray-500 absolute bottom-4 text-xs">
                    Finish Quiz
                </button>
            )}
        </div>
    );
};

export default MatchingGameScreen;