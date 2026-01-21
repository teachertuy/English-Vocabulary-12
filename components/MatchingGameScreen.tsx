
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateStudentProgress, updateUnitActivityProgress } from '../services/firebaseService';

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

const tagColors = ['bg-red-500', 'bg-blue-500', 'bg-green-600', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-lime-500', 'bg-cyan-500', 'bg-emerald-500'];
const getTagColor = (word: string) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = word.charCodeAt(i) + ((hash << 5) - hash);
    return tagColors[Math.abs(hash % tagColors.length)];
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
  durationSeconds: number;
}

const MatchingGameScreen: React.FC<MatchingGameScreenProps> = ({ playerData, vocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack, durationSeconds }) => {
    const [remainingWords, setRemainingWords] = useState<VocabularyWord[]>([]);
    const [currentVietnamese, setCurrentVietnamese] = useState<VocabularyWord | null>(null);
    const [selectedEnglish, setSelectedEnglish] = useState<VocabularyWord | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(durationSeconds || 1200);
    const [gameDetails, setGameDetails] = useState<QuizAnswerDetail[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const startTime = useMemo(() => Date.now(), []);
    const incorrectMatches = useMemo(() => gameDetails.filter(d => d.status === 'incorrect').length, [gameDetails]);
    
    useEffect(() => {
        const initialWords = [...vocabulary];
        setRemainingWords(initialWords);
        if (initialWords.length > 0) setCurrentVietnamese(shuffleArray(initialWords)[0]);
    }, [vocabulary]);

    useEffect(() => {
        if (!classroomId || gameDetails.length === 0) return;
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const incorrectCount = gameDetails.filter(d => d.status === 'incorrect').length;
        updateStudentProgress(classroomId, playerData.name, playerData.class, correctCount, incorrectCount).catch(console.error);
        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const currentScore = ((correctCount / vocabulary.length) * 10).toFixed(1);
        const progressData = { score: currentScore, correct: correctCount, incorrect: incorrectCount, answered: gameDetails.length, totalQuestions: vocabulary.length, details: gameDetails };
        updateUnitActivityProgress(classroomId, grade, unitIdentifier, playerData, activityId, progressData).catch(console.error);
    }, [gameDetails, classroomId, playerData, vocabulary.length, grade, unitNumber, activityId]);

    const handleExitPrematurely = async () => {
        if (isGameOver) return;
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const resultData: Partial<GameResult> = {
            score: ((score / vocabulary.length) * 10).toFixed(1),
            correct: score,
            incorrect: gameDetails.length - score,
            answered: gameDetails.length,
            totalQuestions: vocabulary.length,
            timeTakenSeconds: timeTakenSeconds,
            details: gameDetails,
        };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, resultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        onBack();
    };

    const finishGame = useCallback(async (forceExit = false) => {
        if (isGameOver) return;
        setIsGameOver(true);
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const finalResultData: Partial<GameResult> = { score: ((score / vocabulary.length) * 10).toFixed(1), correct: score, incorrect: gameDetails.length - score, answered: gameDetails.length, totalQuestions: vocabulary.length, timeTakenSeconds, details: gameDetails };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, finalResultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        const fullResult: GameResult = { playerName: playerData.name, playerClass: playerData.class, gameType: 'matching', ...finalResultData } as GameResult;
        if (forceExit) onForceExit(); else onFinish(fullResult);
    }, [isGameOver, startTime, gameDetails, playerData, vocabulary.length, unitNumber, grade, onFinish, onForceExit, classroomId, score, activityId]);

    const handleCheckAnswer = () => {
        if (!selectedEnglish || !currentVietnamese) { setFeedback("Vui lòng chọn một từ tiếng Anh!"); setTimeout(() => setFeedback(null), 2000); return; }
        const isCorrect = selectedEnglish.word === currentVietnamese.word;
        setGameDetails(prev => [...prev, { question: `Nghĩa của "${currentVietnamese.translation}" là gì?`, translation: '', options: [], userAnswer: selectedEnglish.word, correctAnswer: currentVietnamese.word, status: isCorrect ? 'correct' : 'incorrect', explanation: `Từ "${currentVietnamese.word}" có nghĩa là "${currentVietnamese.translation}".` }]);
        let nextWords = remainingWords;
        if (isCorrect) { playCorrectSound(); setScore(prev => prev + 1); nextWords = remainingWords.filter(w => w.word !== currentVietnamese.word); setRemainingWords(nextWords); } else playIncorrectSound();
        setSelectedEnglish(null);
        if (nextWords.length > 0) {
            let newWord = currentVietnamese;
            if (nextWords.length > 1) { const availableWords = nextWords.filter(w => w.word !== currentVietnamese.word); newWord = availableWords[Math.floor(Math.random() * availableWords.length)]; } else newWord = nextWords[0];
            setCurrentVietnamese(newWord);
        } else finishGame();
    };
    
    useEffect(() => {
        if (classroomId) trackStudentPresence(classroomId, playerData.name, playerData.class);
        const timer = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); finishGame(); return 0; } return prev - 1; }); }, 1000);
        return () => clearInterval(timer);
    }, [finishGame, classroomId, playerData.name, playerData.class]);
    useEffect(() => { if (classroomId) { const u = getGameStatus(classroomId, i => !i && finishGame(true)); return () => u(); } }, [classroomId, finishGame]);
    useEffect(() => { if (classroomId) { const u = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishGame(true)); return () => u(); } }, [classroomId, playerData.name, playerData.class, finishGame]);
    useEffect(() => { const h = () => document.hidden && classroomId && incrementCheatCount(classroomId, playerData.name, playerData.class); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [classroomId, playerData.name, playerData.class]);

    const sortedRemainingWords = useMemo(() => [...remainingWords].sort((a, b) => a.word.localeCompare(b.word)), [remainingWords]);
    const splitIndex = Math.ceil(sortedRemainingWords.length / 2);
    const topWords = sortedRemainingWords.slice(0, splitIndex);
    const bottomWords = sortedRemainingWords.slice(splitIndex);

    const WordButtons = ({ words }: { words: VocabularyWord[] }) => (
        <div className="flex flex-wrap justify-center gap-1 p-1 max-w-2xl">
            {words.map(v => (
                <button key={v.word} onClick={() => setSelectedEnglish(v)} className={`px-2.5 py-1 text-xs font-bold rounded-lg text-white shadow-sm transition transform hover:scale-105 ${getTagColor(v.word)} ${selectedEnglish?.word === v.word ? 'ring-2 ring-offset-1 ring-yellow-400 scale-105' : ''}`}>
                    {v.word}
                </button>
            ))}
        </div>
    );
    
    return (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-white min-h-[500px] relative w-full">
            {feedback && <div className="fixed top-5 right-5 shadow-lg rounded-lg p-3 text-sm text-center z-50 bg-red-100 text-red-800"><p className="font-bold">{feedback}</p></div>}
            <div className="w-full max-w-4xl mx-auto mb-2 pt-2">
                <div className="flex justify-between items-center">
                    <button onClick={handleExitPrematurely} className="group flex items-center text-blue-600 font-extrabold text-lg hover:text-blue-800 transition-colors focus:outline-none rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        <span className="border-b-2 border-current pb-0.5">Back</span>
                    </button>
                    
                    <div className="flex flex-col items-center gap-1.5">
                        {/* Correct/Incorrect Redesigned Indicator (Top) */}
                        <div className="bg-white px-5 py-1 rounded-full border-4 border-double border-red-500 flex items-center gap-3 shadow-md">
                            <span className="text-xl font-black text-green-600 font-['Nunito']">{score}</span>
                            <span className="text-lg font-bold text-gray-200">|</span>
                            <span className="text-xl font-black text-red-600 font-['Nunito']">{incorrectMatches}</span>
                        </div>

                        {/* Progress Indicator (Bottom) */}
                        <div className="bg-white px-4 py-0.5 rounded-2xl border border-gray-100 flex items-center shadow-sm min-w-[80px] justify-center">
                            <span className="text-blue-600 text-sm font-black font-['Nunito']">{remainingWords.length} left</span>
                        </div>
                    </div>

                    <div className="bg-white px-4 py-1.5 rounded-2xl border border-red-100 flex items-center shadow-sm font-['Nunito'] font-black text-red-700 text-lg">{formatTime(timeLeft)}</div>
                </div>
            </div>
            <div className="w-full max-w-2xl my-1"><div className="border-t border-black"></div><div className="border-t border-gray-400 mt-0.5"></div></div>
            <WordButtons words={topWords} />
            <div className="flex flex-col items-center justify-center flex-grow w-full my-1">
                 <div className="w-full max-w-[400px]">
                    <div className="bg-black rounded-xl p-0.5 shadow-lg"><div className="bg-white rounded-[10px] p-0.5"><div className="bg-black rounded-[8px] p-0.5"><div className="bg-white rounded-[6px]">
                        <div className={`px-3 pt-5 text-center flex flex-col items-center transition-all duration-500 ${selectedEnglish ? 'pb-5' : 'pb-1'}`}>
                            <p className="text-orange-600 font-extrabold text-xl sm:text-2xl leading-none text-center pb-0.5">{currentVietnamese?.translation}</p>
                            <div className="w-3/4 border-b border-gray-300 my-4"></div>
                            <div className="w-full py-1 border border-dashed border-black rounded flex items-center justify-center min-h-[40px]"><p className={`font-bold text-lg ${selectedEnglish ? 'text-blue-700' : 'text-gray-400'}`}>{selectedEnglish ? selectedEnglish.word : '...'}</p></div>
                            
                            {/* Animated Check Answer Button */}
                            <div className={`w-full overflow-hidden transition-all flex justify-center ${selectedEnglish ? 'opacity-100 max-h-32 mt-4' : 'opacity-0 max-h-0'}`}>
                                <button 
                                    onClick={handleCheckAnswer} 
                                    className="relative overflow-hidden px-8 py-5 rounded-full font-black uppercase tracking-widest bg-black text-white hover:bg-gray-800 transition-all active:scale-95 min-w-[200px]"
                                >
                                    {/* Snowflakes */}
                                    {selectedEnglish && Array.from({ length: 15 }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="snow-particle" 
                                            style={{
                                                left: `${Math.random() * 100}%`,
                                                width: `${2 + Math.random() * 4}px`,
                                                height: `${2 + Math.random() * 4}px`,
                                                animationDuration: `${0.4 + Math.random() * 0.7}s`,
                                                animationDelay: `${Math.random() * 2}s`
                                            }}
                                        />
                                    ))}
                                    <span className="relative z-10 animate-text-pulse inline-block">CHECK ANSWER</span>
                                </button>
                            </div>
                        </div>
                    </div></div></div></div>
                 </div>
            </div>
            <WordButtons words={bottomWords} />
            {remainingWords.length === 1 && <button onClick={() => finishGame(false)} className="bg-gray-800 text-white font-bold py-1.5 px-4 rounded-full absolute bottom-4 text-xs">Finish Quiz</button>}
        </div>
    );
};

export default MatchingGameScreen;
