
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { VocabularyWord, PlayerData, GameResult } from '../types';
import { generateSpeech, generateImagePrompt } from '../services/geminiService';
import { updateVocabularyAudio, updateVocabularyImage, updateUnitActivityResult, removeStudentPresence, trackStudentPresence } from '../services/firebaseService';

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

const CARD_COLORS = ['bg-[#FFF0F0]', 'bg-[#F0F8FF]', 'bg-[#F0FFF4]'];

const ImageWithLoader: React.FC<{ src: string, alt: string, isProcessing?: boolean }> = ({ src, alt, isProcessing }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="w-40 h-40 bg-white rounded-2xl shadow-sm p-3 mb-4 flex items-center justify-center relative overflow-hidden">
            {(!loaded || isProcessing) && <div className="absolute inset-0 flex items-center justify-center z-0"><svg className="animate-spin h-8 w-8 text-teal-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
            <img src={src} alt={alt} className={`max-h-full max-w-full object-contain rounded-xl relative z-10 transition-opacity duration-500 ${loaded && !isProcessing ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} />
        </div>
    );
};

interface VocabularyScreenProps {
  unitNumber: number;
  vocabulary: VocabularyWord[];
  onBack: () => void;
  classroomId: string;
  grade: number | 'topics';
  playerData: PlayerData;
  activityId: string;
  onFinish: (result: GameResult) => void;
}

const VocabularyScreen: React.FC<VocabularyScreenProps> = ({ unitNumber, vocabulary, onBack, classroomId, grade, playerData, activityId, onFinish }) => {
    const [localVocabulary, setLocalVocabulary] = useState<VocabularyWord[]>(vocabulary);
    const [playingWord, setPlayingWord] = useState<string | null>(null);
    const [fetchingWords, setFetchingWords] = useState<Set<string>>(new Set());
    const [fetchingImages, setFetchingImages] = useState<Set<string>>(new Set());
    const [errorWords, setErrorWords] = useState<Set<string>>(new Set());
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const startTime = useMemo(() => Date.now(), []);
    const audioContextRef = useRef<AudioContext | null>(null);
    const isComponentMounted = useRef(true);

    useEffect(() => {
        isComponentMounted.current = true;
        if (classroomId) trackStudentPresence(classroomId, playerData.name, playerData.class);
        return () => { isComponentMounted.current = false; };
    }, [classroomId, playerData]);

    useEffect(() => {
        const startWorker = async () => {
            const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            for (const item of localVocabulary) {
                if (!isComponentMounted.current) break;
                if ((!item.image || item.image.includes('illustration_white_background')) && !fetchingImages.has(item.word)) {
                    try {
                        setFetchingImages(prev => new Set(prev).add(item.word));
                        const highQualityUrl = await generateImagePrompt(item.word, item.translation);
                        if (isComponentMounted.current) {
                            updateVocabularyImage(classroomId, grade, unitId, item.word, highQualityUrl).catch(console.error);
                            setLocalVocabulary(prev => prev.map(w => w.word === item.word ? { ...w, image: highQualityUrl } : w));
                        }
                    } catch (e) { } finally { if (isComponentMounted.current) setFetchingImages(prev => { const next = new Set(prev); next.delete(item.word); return next; }); }
                }
                if (!item.audio && !errorWords.has(item.word) && !isRateLimited && !fetchingWords.has(item.word)) {
                    try {
                        setFetchingWords(prev => new Set(prev).add(item.word));
                        const base64Audio = await generateSpeech(item.word);
                        if (isComponentMounted.current) {
                            updateVocabularyAudio(classroomId, grade, unitId, item.word, base64Audio).catch(console.error);
                            setLocalVocabulary(prev => prev.map(w => w.word === item.word ? { ...w, audio: base64Audio } : w));
                        }
                    } catch (error: any) {
                        if (error?.error?.code === 429) setIsRateLimited(true); else setErrorWords(prev => new Set(prev).add(item.word));
                    } finally { if (isComponentMounted.current) setFetchingWords(prev => { const next = new Set(prev); next.delete(item.word); return next; }); }
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        };
        startWorker();
    }, [unitNumber, classroomId, grade]);

    const handleBackWithSave = async () => {
        if (isFinishing) return;
        setIsFinishing(true);
        const endTime = Date.now();
        const timeTakenSeconds = Math.round((endTime - startTime) / 1000);
        // Change score to 'ĐÃ HỌC' and set correct/incorrect to 0 for vocabulary
        const resultData: Partial<GameResult> = { 
            score: 'ĐÃ HỌC', 
            correct: 0, 
            incorrect: 0, 
            answered: localVocabulary.length, 
            totalQuestions: localVocabulary.length, 
            timeTakenSeconds: timeTakenSeconds, 
            details: localVocabulary.map(v => ({ 
                question: v.word, 
                translation: v.translation, 
                options: [], 
                userAnswer: v.word, 
                correctAnswer: v.word, 
                status: 'correct', 
                explanation: `Bạn đã học từ: ${v.word}` 
            })) 
        };
        try {
            const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            await updateUnitActivityResult(classroomId, grade, unitIdentifier, playerData, activityId, resultData);
            await removeStudentPresence(classroomId, playerData.name, playerData.class);
        } catch (e) { console.error(e); }
        onBack();
    };

    const handlePlaySound = useCallback(async (wordItem: VocabularyWord, e: React.MouseEvent) => {
        e.stopPropagation();
        if (wordItem.audio) {
            if (playingWord) return;
            try {
                setPlayingWord(wordItem.word);
                if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioContext = audioContextRef.current;
                if (audioContext.state === 'suspended') await audioContext.resume();
                const audioBuffer = await decodeAudioData(decode(wordItem.audio), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => setPlayingWord(null);
                source.start();
            } catch (error) { setPlayingWord(null); }
        }
    }, [playingWord]);
    
    return (
        <div className="flex flex-col p-4 sm:p-6 bg-[#FFF8F0] min-h-[600px]">
            <div className="flex items-center justify-between mb-4">
                 <button onClick={handleBackWithSave} className="group flex items-center text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors focus:outline-none rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span>Back</span>
                </button>
                 <h1 className="text-2xl font-extrabold text-center text-gray-800 uppercase tracking-wide">{grade === 'topics' ? `Topic ${unitNumber} Vocabulary` : `Unit ${unitNumber} Vocabulary`}</h1>
                 <div className="w-20"></div> {/* Spacer for alignment */}
            </div>
            {(fetchingImages.size > 0 || fetchingWords.size > 0) && <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-200 flex items-center gap-2 animate-pulse self-center"><div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div><span>AI đang đồng bộ Ảnh & Âm thanh...</span></div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto flex-grow px-2 pb-8 max-w-7xl mx-auto w-full">
                {localVocabulary.map((item, index) => (
                    <div key={index} className={`${CARD_COLORS[index % CARD_COLORS.length]} rounded-[2rem] p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300`}>
                        <ImageWithLoader src={item.image || `https://image.pollinations.ai/prompt/${item.word.replace(/\s+/g, '_')}_illustration_white_background`} alt={item.word} isProcessing={fetchingImages.has(item.word)} />
                        <div className="text-center w-full mb-6">
                            <h2 className="text-2xl font-extrabold text-[#006064] mb-1">{item.word} <span className="text-lg text-[#E91E63]">({item.type})</span></h2>
                            <p className="text-[#00A0A0] font-bold text-lg font-serif mb-2">{item.phonetic}</p>
                            <p className="text-[#FF5252] font-bold text-xl">{item.translation}</p>
                        </div>
                        <button onClick={(e) => handlePlaySound(item, e)} disabled={playingWord === item.word} className={`w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform ${playingWord === item.word ? 'ring-4 ring-blue-200' : ''}`}>
                            <svg className={`h-8 w-8 ${playingWord === item.word ? 'text-blue-600' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M14.016 3.234q3.047 0.656 5.016 3.117t1.969 5.648-1.969 5.648-5.016 3.117v-2.063q2.203-0.656 3.586-2.484t1.383-4.219-1.383-4.219-3.586-2.484v-2.063zM16.5 12q0 2.813-2.484 4.031v-8.063q1.031 0.516 1.758 1.688t0.727 2.344zM3 9h3.984l5.016-5.016v16.031l-5.016-5.016h-3.984v-6z"></path></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VocabularyScreen;
