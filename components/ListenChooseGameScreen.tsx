import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerData, VocabularyWord, GameResult, QuizAnswerDetail, ExerciseSelectionConfig } from '../types';
import { 
    updateUnitActivityResult, 
    trackStudentPresence, 
    incrementCheatCount, 
    listenForKickedStatus, 
    getGameStatus, 
    removeStudentPresence, 
    updateStudentProgress, 
    updateUnitActivityProgress,
    updateVocabularyAudio 
} from '../services/firebaseService';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
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
    try {
        Tone.start();
        const now = Tone.now();
        synth.triggerAttackRelease("C5", "8n", now);
        synth.triggerAttackRelease("G5", "8n", now + 0.2);
    } catch (e) {}
}

function playIncorrectSound() {
    if (!incorrectSynth) return;
    try {
        Tone.start();
        incorrectSynth.triggerAttackRelease("G#5", "1s");
    } catch (e) {}
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const tagColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-600', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 
    'bg-orange-500', 'bg-lime-500', 'bg-cyan-500', 'bg-emerald-500'
];

const getTagColor = (word: string) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = word.charCodeAt(i) + ((hash << 5) - hash);
    return tagColors[Math.abs(hash % tagColors.length)];
};

interface ListenChooseGameScreenProps {
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

const ListenChooseGameScreen: React.FC<ListenChooseGameScreenProps> = ({ 
    playerData, 
    vocabulary, 
    unitNumber, 
    grade, 
    onFinish, 
    onForceExit, 
    classroomId, 
    activityId, 
    onBack, 
    durationSeconds,
    exerciseConfig
}) => {
    const [localVocabulary, setLocalVocabulary] = useState<VocabularyWord[]>([]);
    const [remainingWords, setRemainingWords] = useState<VocabularyWord[]>([]);
    const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
    const [selectedEnglish, setSelectedEnglish] = useState<VocabularyWord | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(durationSeconds > 0 ? durationSeconds : 0);
    const [gameDetails, setGameDetails] = useState<QuizAnswerDetail[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [fetchingAudioWords, setFetchingAudioWords] = useState<Set<string>>(new Set());

    const startTime = useMemo(() => Date.now(), []);
    const incorrectMatches = useMemo(() => gameDetails.filter(d => d.status === 'incorrect').length, [gameDetails]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const isComponentMounted = useRef(true);

    // Initial randomized order of vocabulary buttons (STRICTLY NON-ALPHABETICAL as requested)
    const [shuffledWordPool, setShuffledWordPool] = useState<VocabularyWord[]>([]);

    useEffect(() => {
        isComponentMounted.current = true;
        return () => { isComponentMounted.current = false; };
    }, []);

    useEffect(() => {
        if (vocabulary && vocabulary.length > 0) {
            setLocalVocabulary(vocabulary);
            const initialShuffled = shuffleArray(vocabulary);
            setRemainingWords(initialShuffled);
            setShuffledWordPool(shuffleArray(vocabulary)); // keep non-alphabetical random arrangement
            if (initialShuffled.length > 0) {
                setCurrentWord(initialShuffled[0]);
            }
        }
    }, [vocabulary]);

    // Audio playback function with high fidelity Gemini TTS + SpeechSynthesis fallback
    const playWordAudio = useCallback(async (wordItem: VocabularyWord) => {
        if (!wordItem) return;
        setIsPlayingAudio(true);

        const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;

        // If audio base64 is already present
        if (wordItem.audio) {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const audioContext = audioContextRef.current;
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                const audioBuffer = await decodeAudioData(decode(wordItem.audio), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => {
                    if (isComponentMounted.current) setIsPlayingAudio(false);
                };
                source.start();
                return;
            } catch (err) {
                console.warn("Audio buffer playback error, using SpeechSynthesis fallback:", err);
            }
        }

        // Try to fetch speech in background if not cached yet
        if (!wordItem.audio && classroomId && !fetchingAudioWords.has(wordItem.word)) {
            setFetchingAudioWords(prev => new Set(prev).add(wordItem.word));
            generateSpeech(wordItem.word).then(base64Audio => {
                if (base64Audio && isComponentMounted.current) {
                    updateVocabularyAudio(classroomId, grade, unitIdentifier, wordItem.word, base64Audio).catch(console.error);
                    setLocalVocabulary(prev => prev.map(w => w.word === wordItem.word ? { ...w, audio: base64Audio } : w));
                    setRemainingWords(prev => prev.map(w => w.word === wordItem.word ? { ...w, audio: base64Audio } : w));
                    if (currentWord && currentWord.word === wordItem.word) {
                        setCurrentWord(prev => prev ? { ...prev, audio: base64Audio } : null);
                    }
                }
            }).catch(console.error).finally(() => {
                if (isComponentMounted.current) {
                    setFetchingAudioWords(prev => {
                        const next = new Set(prev);
                        next.delete(wordItem.word);
                        return next;
                    });
                }
            });
        }

        // SpeechSynthesis fallback
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(wordItem.word);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.onend = () => {
                if (isComponentMounted.current) setIsPlayingAudio(false);
            };
            utterance.onerror = () => {
                if (isComponentMounted.current) setIsPlayingAudio(false);
            };
            window.speechSynthesis.speak(utterance);
        } else {
            setIsPlayingAudio(false);
        }
    }, [classroomId, grade, unitNumber, fetchingAudioWords, currentWord]);

    // Auto-play audio when current word changes
    useEffect(() => {
        if (currentWord) {
            const timer = setTimeout(() => {
                playWordAudio(currentWord);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [currentWord?.word]);

    // Progress updates to Firebase
    useEffect(() => {
        if (!classroomId || gameDetails.length === 0) return;
        const correctCount = gameDetails.filter(d => d.status === 'correct').length;
        const incorrectCount = gameDetails.filter(d => d.status === 'incorrect').length;
        updateStudentProgress(classroomId, playerData.name, playerData.class, correctCount, incorrectCount).catch(console.error);
        
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
        updateUnitActivityProgress(classroomId, grade, unitIdentifier, playerData, activityId, progressData).catch(console.error);
    }, [gameDetails, classroomId, playerData, vocabulary.length, grade, unitNumber, activityId]);

    const handleExitPrematurely = () => {
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
        const finalResultData: Partial<GameResult> = { 
            score: ((score / vocabulary.length) * 10).toFixed(1), 
            correct: score, 
            incorrect: gameDetails.length - score, 
            answered: gameDetails.length, 
            totalQuestions: vocabulary.length, 
            timeTakenSeconds, 
            details: gameDetails 
        };
        if (classroomId && activityId) {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, finalResultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        }
        const fullResult: GameResult = { 
            playerName: playerData.name, 
            playerClass: playerData.class, 
            gameType: 'listen-choose', 
            ...finalResultData 
        } as GameResult;
        if (forceExit) onForceExit(); else onFinish(fullResult);
    }, [isGameOver, startTime, gameDetails, playerData, vocabulary.length, unitNumber, grade, onFinish, onForceExit, classroomId, score, activityId]);

    const handleCheckAnswer = () => {
        if (!selectedEnglish || !currentWord) { 
            setFeedback("Vui lòng chọn một từ tiếng Anh!"); 
            setTimeout(() => setFeedback(null), 2000); 
            return; 
        }

        const isCorrect = selectedEnglish.word.trim().toLowerCase() === currentWord.word.trim().toLowerCase();
        
        setGameDetails(prev => [
            ...prev, 
            { 
                question: `Nghe phát âm từ tiếng Anh`, 
                translation: currentWord.translation, 
                options: [], 
                userAnswer: selectedEnglish.word, 
                correctAnswer: currentWord.word, 
                status: isCorrect ? 'correct' : 'incorrect', 
                explanation: `Từ phát âm là "${currentWord.word}" (nghĩa: "${currentWord.translation}").` 
            }
        ]);

        let nextWords = remainingWords;
        if (isCorrect) { 
            playCorrectSound(); 
            setScore(prev => prev + 1); 
            nextWords = remainingWords.filter(w => w.word !== currentWord.word); 
            setRemainingWords(nextWords); 
        } else {
            playIncorrectSound(); 
        }

        setSelectedEnglish(null);

        if (nextWords.length > 0) {
            let newWord = currentWord;
            if (nextWords.length > 1) { 
                const availableWords = nextWords.filter(w => w.word !== currentWord.word); 
                newWord = availableWords[Math.floor(Math.random() * availableWords.length)]; 
            } else {
                newWord = nextWords[0]; 
            }
            setCurrentWord(newWord);
        } else {
            finishGame();
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

    useEffect(() => { 
        if (classroomId) { 
            const u = getGameStatus(classroomId, i => !i && finishGame(true)); 
            return () => u(); 
        } 
    }, [classroomId, finishGame]);

    useEffect(() => { 
        if (classroomId) { 
            const u = listenForKickedStatus(classroomId, playerData.name, playerData.class, () => finishGame(true)); 
            return () => u(); 
        } 
    }, [classroomId, playerData.name, playerData.class, finishGame]);

    useEffect(() => { 
        const h = () => document.hidden && classroomId && incrementCheatCount(classroomId, playerData.name, playerData.class); 
        document.addEventListener('visibilitychange', h); 
        return () => document.removeEventListener('visibilitychange', h); 
    }, [classroomId, playerData.name, playerData.class]);

    // Active words arranged randomly (NON-ALPHABETICAL), filtered by remaining words
    const activeRandomWords = useMemo(() => {
        const remainingSet = new Set(remainingWords.map(w => w.word));
        return shuffledWordPool.filter(w => remainingSet.has(w.word));
    }, [shuffledWordPool, remainingWords]);

    const splitIndex = Math.ceil(activeRandomWords.length / 2);
    const topWords = activeRandomWords.slice(0, splitIndex);
    const bottomWords = activeRandomWords.slice(splitIndex);

    const WordButtons = ({ words }: { words: VocabularyWord[] }) => (
        <div className="flex flex-wrap justify-center gap-1.5 p-1 max-w-3xl">
            {words.map(v => (
                <button 
                    key={v.word} 
                    onClick={() => setSelectedEnglish(v)} 
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg text-white shadow-sm transition transform hover:scale-105 active:scale-95 cursor-pointer ${getTagColor(v.word)} ${selectedEnglish?.word === v.word ? 'ring-4 ring-offset-2 ring-yellow-400 scale-105 font-black' : ''}`}
                >
                    {v.word}
                </button>
            ))}
        </div>
    );
    
    return (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-white min-h-[520px] relative w-full select-none">
            {feedback && (
                <div className="fixed top-5 right-5 shadow-lg rounded-lg p-3 text-sm text-center z-50 bg-red-100 text-red-800 border border-red-300">
                    <p className="font-bold">{feedback}</p>
                </div>
            )}

            <div className="w-full max-w-4xl mx-auto mb-2 pt-0 relative min-h-[60px]">
                {/* <<Quay lại on absolute top-left edge */}
                <div className="absolute top-0 left-0 z-10">
                    <ActivityBackButton onClick={handleExitPrematurely} config={exerciseConfig} />
                </div>
                
                {/* Centered Column: Timer (Top) -> Correct/Incorrect Count -> Progress */}
                <div className="flex flex-col items-center justify-center gap-0.5 w-full mx-auto">
                    {/* Timer Indicator (Top) */}
                    {durationSeconds > 0 ? (
                        <div className="bg-white px-3 py-0.5 rounded-2xl border border-red-100 flex items-center shadow-sm font-['Nunito'] font-black text-red-700 text-sm">
                            ⏱️ {formatTime(timeLeft)}
                        </div>
                    ) : (
                        <div className="bg-white px-3 py-0.5 rounded-2xl border border-green-100 flex items-center shadow-sm font-['Nunito'] font-black text-green-700 text-sm">
                            ∞
                        </div>
                    )}

                    {/* Correct/Incorrect Indicator */}
                    <div className="bg-white px-3 py-0.5 rounded-full border-2 border-rose-500 flex items-center gap-1.5 shadow-sm">
                        <span className="text-sm font-black text-green-600 font-['Nunito']">{score}</span>
                        <span className="text-xs font-bold text-gray-300">|</span>
                        <span className="text-sm font-black text-red-600 font-['Nunito']">{incorrectMatches}</span>
                    </div>

                    {/* Progress Indicator (Bottom) */}
                    <div className="bg-white px-3 py-0.5 rounded-2xl border border-gray-100 flex items-center shadow-sm min-w-[70px] justify-center">
                        <span className="text-rose-600 text-[10px] font-black font-['Nunito']">Còn {remainingWords.length} từ</span>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-2xl my-1.5">
                <div className="border-t-2 border-rose-600"></div>
                <div className="border-t border-rose-300 mt-0.5"></div>
            </div>

            {/* Top row of randomly arranged words */}
            <WordButtons words={topWords} />

            {/* Central interactive speaker & matching frame */}
            <div className="flex flex-col items-center justify-center flex-grow w-full my-2">
                 <div className="w-full max-w-[420px]">
                    <div className="bg-black rounded-2xl p-0.5 shadow-xl">
                        <div className="bg-white rounded-[14px] p-0.5">
                            <div className="bg-black rounded-[12px] p-0.5">
                                <div className="bg-white rounded-[10px]">
                                    <div className={`px-4 pt-5 text-center flex flex-col items-center transition-all duration-500 ${selectedEnglish ? 'pb-5' : 'pb-3'}`}>
                                        
                                        {/* Speaker Icon and Soundwave Button */}
                                        <YellowSpeakerButton
                                            onClick={() => currentWord && playWordAudio(currentWord)}
                                            isPlaying={isPlayingAudio}
                                            isLoading={currentWord ? fetchingAudioWords.has(currentWord.word) : false}
                                        />

                                        <div className="w-3/4 border-b border-gray-200 my-3"></div>

                                        {/* Selected English Word Box */}
                                        <div className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center min-h-[48px] bg-gray-50/50">
                                            <p className={`font-black text-xl transition-all ${selectedEnglish ? 'text-rose-700' : 'text-gray-400 italic text-xs'}`}>
                                                {selectedEnglish ? selectedEnglish.word : '(Nghe kỹ và chọn từ đúng)'}
                                            </p>
                                        </div>
                                        
                                        {/* Animated Check Answer Button with snow particles */}
                                        <div className={`w-full overflow-hidden transition-all flex justify-center ${selectedEnglish ? 'opacity-100 max-h-32 mt-4' : 'opacity-0 max-h-0'}`}>
                                            <button 
                                                onClick={handleCheckAnswer} 
                                                className="relative overflow-hidden px-8 py-4 rounded-full font-black uppercase tracking-widest bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700 shadow-md transition-all active:scale-95 min-w-[210px] cursor-pointer"
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
                                                <span className="relative z-10 animate-text-pulse inline-block font-extrabold">CHECK ANSWER</span>
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Bottom row of randomly arranged words */}
            <WordButtons words={bottomWords} />

            {remainingWords.length === 1 && (
                <button 
                    onClick={() => finishGame(false)} 
                    className="bg-gray-800 text-white font-bold py-1.5 px-4 rounded-full absolute bottom-4 text-xs hover:bg-black transition-colors"
                >
                    Hoàn thành
                </button>
            )}
        </div>
    );
};

export default ListenChooseGameScreen;
