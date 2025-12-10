
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail } from '../types';
import { updateUnitActivityResult, trackStudentPresence, incrementCheatCount, listenForKickedStatus, getGameStatus, removeStudentPresence, updateVocabularyAudio } from '../services/firebaseService';
import { generateSpeech } from '../services/geminiService';

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

// --- Audio Helper Functions ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
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
    
    // Audio State
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

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
            setIsPlayingAudio(false); // Reset audio state
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

    // --- Audio Logic ---
    const handlePlayAudio = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (isPlayingAudio || isLoadingAudio || isRateLimited) return;

        try {
            setIsLoadingAudio(true);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            let base64Audio = currentWord.audio;

            // If not cached locally in the object, we check if we need to fetch from API
            if (!base64Audio) {
                 base64Audio = await generateSpeech(currentWord.word);
                 // Save to Firebase for future use
                 const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
                 updateVocabularyAudio(classroomId, grade, unitIdentifier, currentWord.word, base64Audio).catch(err => console.error("Failed to cache audio", err));
                 
                 // Update the current word in the array so we don't fetch again this session if we revisited
                 currentWord.audio = base64Audio; 
            }

            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                setIsPlayingAudio(false);
            };

            source.start();
            setIsPlayingAudio(true);
            setIsLoadingAudio(false);

        } catch (error: any) {
            console.error("Failed to play sound:", error);
            setIsLoadingAudio(false);
            setIsPlayingAudio(false);
            
            const apiError = error as any;
            if (apiError?.error?.code === 429 || apiError?.error?.status === 'RESOURCE_EXHAUSTED') {
                setIsRateLimited(true);
            }
        }
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

    // Compact styles
    let inputClasses = "w-full text-center text-xl font-bold bg-white rounded-lg py-2 pl-4 pr-4 focus:outline-none transition-all duration-300 border-2 border-gray-300 focus:ring-2 focus:ring-blue-300 shadow-inner";
    if (inputStatus === 'correct') inputClasses = "w-full text-center text-xl font-bold bg-green-50 text-green-700 rounded-lg py-2 pl-4 pr-4 focus:outline-none transition-all duration-300 border-2 border-green-500 ring-2 ring-green-200 shadow-inner";
    if (inputStatus === 'incorrect') inputClasses = "w-full text-center text-xl font-bold bg-red-50 text-red-700 rounded-lg py-2 pl-4 pr-4 focus:outline-none transition-all duration-300 border-2 border-red-500 ring-2 ring-red-200 shadow-inner";
    
    return (
        <div className="flex flex-col items-center justify-start p-4 bg-white min-h-[600px] relative">
            {/* TOP BAR: Back button, Stats, Score */}
            <div className="w-full max-w-4xl mx-auto flex justify-between items-center mb-6 pt-2">
                <button onClick={onBack} className="group flex items-center text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="border-b-2 border-current pb-0.5">Back</span>
                </button>

                <div className="flex items-center gap-4">
                    {/* Current Index Box - White Background */}
                    <div title="Từ đang làm" className="flex items-center gap-1.5 bg-white text-gray-700 font-bold px-3 py-1.5 rounded-xl border-2 border-gray-200 shadow-sm">
                        <span className="font-extrabold text-blue-600 text-sm font-['Bungee'] tracking-widest">{currentIndex + 1}</span>
                        <span className="text-gray-400 text-xs font-['Bungee']">/</span>
                        <span className="text-gray-500 text-sm font-['Bungee']">{shuffledVocabulary.length}</span>
                    </div>

                    {/* Score Circle - White Background, Double Red Border, Unique Bungee Font, Red Text */}
                    <div title="Kết quả Đúng / Sai" className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-full border-4 border-double border-red-500 shadow-md">
                        <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-600 w-5 text-center text-lg font-['Bungee']">{correctAnswers}</span>
                        </div>
                        <div className="h-4 w-0.5 bg-red-200"></div>
                        <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-600 w-5 text-center text-lg font-['Bungee']">{incorrectAnswers}</span>
                        </div>
                    </div>
                </div>
                
                 {/* Timer Box - White Background */}
                 <div className="flex items-center gap-1.5 bg-white text-red-700 font-bold px-3 py-1.5 rounded-xl border-2 border-red-200 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-['Bungee'] tracking-wider text-base" style={{fontVariantNumeric: 'tabular-nums'}}>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* MAIN CONTENT AREA - Compact Layout */}
            <div className="flex flex-col items-center justify-start mt-4 flex-grow w-full max-w-sm">
                
                {/* Audio Button with Broadcasting Wave Effect */}
                <button
                    onClick={handlePlayAudio}
                    type="button"
                    disabled={isRateLimited || isLoadingAudio || isPlayingAudio}
                    className={`mb-4 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 outline-none relative overflow-visible
                        ${isPlayingAudio 
                            ? 'bg-blue-50 scale-105' 
                            : 'bg-white hover:bg-gray-50 hover:scale-105 active:scale-95 border-2 border-gray-200'
                        }
                    `}
                    title="Nghe phát âm"
                >
                    {isLoadingAudio ? (
                         <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <div className="relative flex items-center justify-center">
                            {/* Broadcasting Waves Animation - Only visible when playing */}
                            {isPlayingAudio && (
                                <>
                                    <div className="absolute rounded-full border-2 border-blue-400 opacity-0 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] h-full w-full inset-0"></div>
                                    <div className="absolute rounded-full border-2 border-blue-300 opacity-0 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s] h-full w-full inset-0"></div>
                                </>
                            )}
                            
                             <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 transition-colors duration-300 ${isPlayingAudio ? 'text-blue-600' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.016 3.234q3.047 0.656 5.016 3.117t1.969 5.648-1.969 5.648-5.016 3.117v-2.063q2.203-0.656 3.586-2.484t1.383-4.219-1.383-4.219-3.586-2.484v-2.063zM16.5 12q0 2.813-2.484 4.031v-8.063q1.031 0.516 1.758 1.688t0.727 2.344zM3 9h3.984l5.016-5.016v16.031l-5.016-5.016h-3.984v-6z"></path>
                            </svg>
                        </div>
                    )}
                </button>

                {/* Word Meaning - Reduced Font Size */}
                <p className="text-orange-500 font-extrabold text-2xl sm:text-3xl mb-4 text-center drop-shadow-sm">{currentWord?.translation}</p>
                
                <form onSubmit={(e) => { e.preventDefault(); handleCheckAnswer(); }} className="w-full space-y-3 flex flex-col items-center">
                    <div className="w-full relative max-w-sm">
                         <span 
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl pointing-finger"
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
                            className={inputClasses}
                            disabled={isChecking}
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold py-2 px-6 rounded-full shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-base" 
                        disabled={isChecking || !userInput.trim()}
                    >
                        Check answer
                    </button>
                </form>
            </div>

            {/* Finish Button - Absolute Position Bottom Right */}
            <button 
                onClick={() => finishGame(false)} 
                className="absolute bottom-4 right-4 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-full shadow hover:bg-gray-300 transition-all text-xs"
            >
                Finish Quiz
            </button>
        </div>
    );
};

export default SpellingGameScreen;
