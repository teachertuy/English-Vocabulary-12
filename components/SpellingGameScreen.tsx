
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail, ExerciseSelectionConfig } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateVocabularyAudio, updateStudentProgress, updateUnitActivityProgress } from '../services/firebaseService';
import { generateSpeech } from '../services/geminiService';
import { YellowSpeakerButton } from './YellowSpeakerIcon';
import { ActivityBackButton } from './ActivityBackButton';


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

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
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
  durationSeconds: number;
  exerciseConfig?: Partial<ExerciseSelectionConfig>;
}

const SpellingGameScreen: React.FC<SpellingGameScreenProps> = ({ playerData, vocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId, onBack, durationSeconds, exerciseConfig }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [timeLeft, setTimeLeft] = useState(durationSeconds > 0 ? durationSeconds : 0);
    const [userInput, setUserInput] = useState('');
    const [gameDetails, setGameDetails] = useState<QuizAnswerDetail[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [inputStatus, setInputStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const startTime = useMemo(() => Date.now(), []);
    const shuffledVocabulary = useMemo(() => shuffleArray(vocabulary), [vocabulary]);
    const currentWord = shuffledVocabulary[currentIndex];
    const incorrectAnswers = useMemo(() => gameDetails.filter(d => d.status === 'incorrect').length, [gameDetails]);

    useEffect(() => {
        if (!classroomId || gameDetails.length === 0) return;
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const incorrectCount = gameDetails.filter(d => d.status === 'incorrect').length;
        updateStudentProgress(classroomId, playerData.name, playerData.class, correctCount, incorrectCount).catch(console.error);
        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const currentScore = ((correctCount / shuffledVocabulary.length) * 10).toFixed(1);
        const progressData = { score: currentScore, correct: correctCount, incorrect: incorrectCount, answered: gameDetails.length, totalQuestions: shuffledVocabulary.length, details: gameDetails };
        updateUnitActivityProgress(classroomId, grade, unitIdentifier, playerData, activityId, progressData).catch(console.error);
    }, [gameDetails, classroomId, playerData, shuffledVocabulary.length, grade, unitNumber, activityId]);

    const handleExitPrematurely = () => {
        if (isGameOver) return;
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const resultData: Partial<GameResult> = {
            score: ((correctCount / shuffledVocabulary.length) * 10).toFixed(1),
            correct: correctCount,
            incorrect: gameDetails.length - correctCount,
            answered: gameDetails.length,
            totalQuestions: shuffledVocabulary.length,
            timeTakenSeconds: timeTakenSeconds,
            details: gameDetails,
        };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, resultData).catch(console.error);
            removeStudentPresence(classroomId, playerData.name, playerData.class).catch(console.error);
        }
        onBack();
    };

    const finishGame = useCallback(async (forceExit = false) => {
        if (isGameOver) return;
        setIsGameOver(true);
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const finalResultData: Partial<GameResult> = { score: ((correctCount / shuffledVocabulary.length) * 10).toFixed(1), correct: correctCount, incorrect: gameDetails.length - correctCount, answered: gameDetails.length, totalQuestions: shuffledVocabulary.length, timeTakenSeconds, details: gameDetails };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, finalResultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        const fullResult: GameResult = { playerName: playerData.name, playerClass: playerData.class, gameType: 'spelling', ...finalResultData } as GameResult;
        if (forceExit) onForceExit(); else onFinish(fullResult);
    }, [isGameOver, startTime, gameDetails, playerData, shuffledVocabulary, unitNumber, grade, onFinish, onForceExit, classroomId, activityId]);
    
    const handleNextWord = useCallback(() => { if (currentIndex < shuffledVocabulary.length - 1) { setCurrentIndex(prev => prev + 1); setUserInput(''); setIsChecking(false); setInputStatus('idle'); setIsPlayingAudio(false); } else finishGame(); }, [currentIndex, shuffledVocabulary.length, finishGame]);
    useEffect(() => { inputRef.current?.focus(); }, [currentIndex]);
    const handleCheckAnswer = () => {
        if (!userInput.trim() || isChecking) return;
        setIsChecking(true);
        const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
        setGameDetails(prev => [...prev, { question: currentWord.translation, translation: currentWord.word, options: [], userAnswer: userInput.trim(), correctAnswer: currentWord.word, status: isCorrect ? 'correct' : 'incorrect', explanation: `Từ "${currentWord.word}" (${currentWord.type}) có phiên âm /${currentWord.phonetic}/.` }]);
        if (isCorrect) { playCorrectSound(); setCorrectAnswers(prev => prev + 1); setInputStatus('correct'); } else { playIncorrectSound(); setInputStatus('incorrect'); }
        setTimeout(handleNextWord, 1200);
    };

    const handlePlayAudio = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (isPlayingAudio || isLoadingAudio) return;
        try {
            setIsLoadingAudio(true);
            let base64Audio = currentWord.audio;
            if (!base64Audio) {
                try {
                    base64Audio = await generateSpeech(currentWord.word);
                    if (base64Audio) {
                        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
                        updateVocabularyAudio(classroomId!, grade, unitIdentifier, currentWord.word, base64Audio).catch(() => {});
                        currentWord.audio = base64Audio;
                    }
                } catch (e) {
                    base64Audio = '';
                }
            }
            if (base64Audio) {
                if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioContext = audioContextRef.current;
                if (audioContext.state === 'suspended') await audioContext.resume();
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => setIsPlayingAudio(false);
                source.start();
                setIsPlayingAudio(true);
            } else {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(currentWord.word);
                    utterance.lang = 'en-US';
                    utterance.onend = () => setIsPlayingAudio(false);
                    setIsPlayingAudio(true);
                    window.speechSynthesis.speak(utterance);
                }
            }
            setIsLoadingAudio(false);
        } catch (error: any) {
            setIsLoadingAudio(false); 
            setIsPlayingAudio(false);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(currentWord.word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    useEffect(() => {
        if (classroomId) trackStudentPresence(classroomId, playerData.name, playerData.class);
        
        if (durationSeconds > 0) {
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
        }
    }, [finishGame, classroomId, playerData.name, playerData.class, durationSeconds]);

    useEffect(() => { if (classroomId) { const u = getGameStatus(classroomId, i => !i && finishGame(true)); return () => u(); } }, [classroomId, finishGame]);
    useEffect(() => { if (classroomId) { const u = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishGame(true)); return () => u(); } }, [classroomId, playerData.name, playerData.class, finishGame]);
    useEffect(() => { const h = () => document.hidden && classroomId && incrementCheatCount(classroomId, playerData.name, playerData.class); document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [classroomId, playerData.name, playerData.class]);

    let inputClasses = "w-full text-center text-xl font-bold bg-white rounded-lg py-2 pl-4 pr-4 focus:outline-none transition-all duration-300 border-2 border-gray-300 focus:ring-2 focus:ring-blue-300 shadow-inner";
    if (inputStatus === 'correct') inputClasses = "w-full text-center text-xl font-bold bg-green-50 text-green-700 rounded-lg py-2 pl-4 pr-4 border-2 border-green-500 ring-2 ring-green-200";
    if (inputStatus === 'incorrect') inputClasses = "w-full text-center text-xl font-bold bg-red-50 text-red-700 rounded-lg py-2 pl-4 pr-4 border-2 border-red-500 ring-2 ring-red-200";
    
    return (
        <div className="flex flex-col items-center justify-start p-4 bg-white min-h-[600px] relative w-full">
            <div className="w-full max-w-4xl mx-auto mb-4 pt-0 relative min-h-[60px]">
                {/* <<Quay lại on absolute top-left edge */}
                <div className="absolute top-0 left-0 z-10">
                    <ActivityBackButton onClick={handleExitPrematurely} config={exerciseConfig} />
                </div>

                {/* Centered Column: Timer (Top) -> Correct/Incorrect Count -> Progress */}
                <div className="flex flex-col items-center justify-center gap-0 w-full mx-auto">
                    {/* Timer Indicator */}
                    {durationSeconds > 0 ? (
                        <div className="bg-white px-3 py-0.5 rounded-2xl border border-red-100 flex items-center shadow-sm">
                            <span className="text-red-700 text-sm font-black font-['Nunito']">{formatTime(timeLeft)}</span>
                        </div>
                    ) : (
                        <div className="bg-white px-3 py-0.5 rounded-2xl border border-green-100 flex items-center shadow-sm">
                            <span className="text-green-700 text-sm font-black font-['Nunito']">∞</span>
                        </div>
                    )}

                    {/* Correct/Incorrect Redesigned Indicator (Small Frame & Numbers) */}
                    <div className="bg-white px-3 py-0.5 rounded-full border-2 border-red-500 flex items-center gap-1.5 shadow-sm">
                        <span className="text-sm font-black text-green-600 font-['Nunito']">{correctAnswers}</span>
                        <span className="text-xs font-bold text-gray-300">|</span>
                        <span className="text-sm font-black text-red-600 font-['Nunito']">{incorrectAnswers}</span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="bg-white px-3 py-0.5 rounded-2xl border border-gray-100 flex items-center shadow-sm min-w-[70px] justify-center">
                        <span className="text-blue-600 text-xs font-black font-['Nunito']">{currentIndex + 1} / {shuffledVocabulary.length}</span>
                    </div>
                </div>
            </div>



            <div className="flex flex-col items-center justify-start mt-4 flex-grow w-full max-w-sm">
                <div className="mb-4">
                    <YellowSpeakerButton
                        onClick={handlePlayAudio}
                        isPlaying={isPlayingAudio}
                        isLoading={isLoadingAudio}
                        disabled={isRateLimited}
                    />
                </div>
                <p className="text-orange-500 font-black text-3xl sm:text-4xl mb-6 text-center drop-shadow-sm">{currentWord?.translation}</p>
                <form onSubmit={(e) => { e.preventDefault(); handleCheckAnswer(); }} className="w-full space-y-4 flex flex-col items-center">
                    <div className="w-full relative max-w-sm"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-3xl pointing-finger" style={{ top: 'calc(50% - 2px)' }}>👉</span><input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} className={inputClasses} disabled={isChecking} autoComplete="off" placeholder="Write the English word..."/></div>
                    
                    {/* Animated Check Answer Button */}
                    <button 
                        type="submit" 
                        className="relative overflow-hidden bg-black text-white font-black py-4 px-10 rounded-full shadow-xl hover:bg-gray-800 transition-all uppercase tracking-widest active:scale-95 disabled:bg-gray-400 min-w-[240px]" 
                        disabled={isChecking || !userInput.trim()}
                    >
                        {/* Snowflakes */}
                        {!isChecking && userInput.trim() && Array.from({ length: 15 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="snow-particle" 
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    width: `${2 + Math.random() * 4}px`,
                                    height: `${2 + Math.random() * 4}px`,
                                    animationDuration: `${0.5 + Math.random() * 0.8}s`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                        <span className="relative z-10 animate-text-pulse inline-block">CHECK ANSWER</span>
                    </button>
                </form>
            </div>
            
            <button onClick={() => finishGame(false)} className="absolute bottom-6 left-6 bg-gray-100 text-gray-400 font-bold py-1.5 px-4 rounded-full text-xs hover:text-gray-600 transition-colors">Finish Early</button>
        </div>
    );
};

export default SpellingGameScreen;
