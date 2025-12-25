
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VocabularyWord } from '../types';
import { generateSpeech, generateImagePrompt } from '../services/geminiService';
import { updateVocabularyAudio, updateVocabularyImage } from '../services/firebaseService';

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

const CARD_COLORS = ['bg-[#FFF0F0]', 'bg-[#F0F8FF]', 'bg-[#F0FFF4]'];

const ImageWithLoader: React.FC<{ src: string, alt: string, isProcessing?: boolean }> = ({ src, alt, isProcessing }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="w-40 h-40 bg-white rounded-2xl shadow-sm p-3 mb-4 flex items-center justify-center relative overflow-hidden">
            {(!loaded || isProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <svg className="animate-spin h-8 w-8 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            <img 
                src={src} 
                alt={alt} 
                className={`max-h-full max-w-full object-contain rounded-xl relative z-10 transition-opacity duration-500 ${loaded && !isProcessing ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={(e) => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/150?text=${alt}`; setLoaded(true); }}
            />
            {isProcessing && (
                <div className="absolute bottom-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
            )}
        </div>
    );
};

interface VocabularyScreenProps {
  unitNumber: number;
  vocabulary: VocabularyWord[];
  onBack: () => void;
  classroomId: string;
  grade: number | 'topics';
}

const VocabularyScreen: React.FC<VocabularyScreenProps> = ({ unitNumber, vocabulary, onBack, classroomId, grade }) => {
    const [localVocabulary, setLocalVocabulary] = useState<VocabularyWord[]>(vocabulary);
    const [playingWord, setPlayingWord] = useState<string | null>(null);
    const [fetchingWords, setFetchingWords] = useState<Set<string>>(new Set());
    const [fetchingImages, setFetchingImages] = useState<Set<string>>(new Set());
    const [errorWords, setErrorWords] = useState<Set<string>>(new Set());
    const [isRateLimited, setIsRateLimited] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const isComponentMounted = useRef(true);

    useEffect(() => {
        isComponentMounted.current = true;
        return () => { isComponentMounted.current = false; };
    }, []);

    // --- CƠ CHẾ SIÊU HÀNG ĐỢI AI (Pre-fetching & Optimization) ---
    useEffect(() => {
        const startWorker = async () => {
            const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            
            for (const item of localVocabulary) {
                if (!isComponentMounted.current) break;

                // 1. TỐI ƯU HÌNH ẢNH: Nếu chưa có link AI "xịn" (có chứa keyword Illustrating)
                const isPlaceholderImg = !item.image || item.image.includes('illustration_white_background');
                if (isPlaceholderImg && !fetchingImages.has(item.word)) {
                    try {
                        setFetchingImages(prev => new Set(prev).add(item.word));
                        const highQualityUrl = await generateImagePrompt(item.word, item.translation);
                        
                        if (isComponentMounted.current) {
                            updateVocabularyImage(classroomId, grade, unitId, item.word, highQualityUrl).catch(console.error);
                            setLocalVocabulary(prev => prev.map(w => w.word === item.word ? { ...w, image: highQualityUrl } : w));
                        }
                    } catch (e) {
                        console.warn("Failed to optimize image for:", item.word);
                    } finally {
                        if (isComponentMounted.current) {
                            setFetchingImages(prev => { const next = new Set(prev); next.delete(item.word); return next; });
                        }
                    }
                }

                // 2. TẠO ÂM THANH: Nếu chưa có audio
                if (!item.audio && !errorWords.has(item.word) && !isRateLimited) {
                    try {
                        setFetchingWords(prev => new Set(prev).add(item.word));
                        const base64Audio = await generateSpeech(item.word);
                        
                        if (isComponentMounted.current) {
                            updateVocabularyAudio(classroomId, grade, unitId, item.word, base64Audio).catch(console.error);
                            setLocalVocabulary(prev => prev.map(w => w.word === item.word ? { ...w, audio: base64Audio } : w));
                        }
                    } catch (error: any) {
                        const code = error?.error?.code;
                        if (code === 429) setIsRateLimited(true);
                        else setErrorWords(prev => new Set(prev).add(item.word));
                    } finally {
                        if (isComponentMounted.current) {
                            setFetchingWords(prev => { const next = new Set(prev); next.delete(item.word); return next; });
                        }
                    }
                }

                // Nghỉ 1.5 giây giữa mỗi từ để không bị chặn API
                await new Promise(r => setTimeout(r, 1500));
            }
        };

        startWorker();
    }, [unitNumber, classroomId, grade]);

    const handlePlaySound = useCallback(async (wordItem: VocabularyWord, e: React.MouseEvent) => {
        e.stopPropagation();
        if (playingWord) return;

        try {
            setPlayingWord(wordItem.word);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') await audioContext.resume();

            let base64Audio = wordItem.audio;

            if (!base64Audio) {
                setFetchingWords(prev => new Set(prev).add(wordItem.word));
                try {
                    base64Audio = await generateSpeech(wordItem.word);
                    const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
                    updateVocabularyAudio(classroomId, grade, unitId, wordItem.word, base64Audio).catch(console.error);
                    setLocalVocabulary(prev => prev.map(w => w.word === wordItem.word ? { ...w, audio: base64Audio } : w));
                } catch (err: any) {
                    if (err?.error?.code === 429) setIsRateLimited(true);
                    throw err;
                } finally {
                    setFetchingWords(prev => { const next = new Set(prev); next.delete(wordItem.word); return next; });
                }
            }

            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => setPlayingWord(null);
            source.start();

        } catch (error: any) {
            console.error("Playback error:", error);
            setPlayingWord(null);
            setErrorWords(prev => new Set(prev).add(wordItem.word));
            setTimeout(() => {
                setErrorWords(prev => { const next = new Set(prev); next.delete(wordItem.word); return next; });
            }, 5000);
        }
    }, [playingWord, classroomId, grade, unitNumber]);
    
    return (
        <div className="flex flex-col p-4 sm:p-6 bg-[#FFF8F0] min-h-[600px]">
            <div className="flex items-center justify-between mb-4">
                 <button onClick={onBack} className="group flex items-center text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors focus:outline-none rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>
                 <h1 className="text-2xl font-extrabold text-center text-gray-800 uppercase tracking-wide">
                    {grade === 'topics' ? `Topic ${unitNumber} Vocabulary` : `Unit ${unitNumber} Vocabulary`}
                </h1>
                <div className="w-20"></div> 
            </div>

            {(fetchingImages.size > 0 || fetchingWords.size > 0) && (
                <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-lg border border-blue-200 flex items-center gap-2 animate-pulse self-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                    <span>AI đang xếp hàng tạo học liệu (Ảnh & Âm thanh)...</span>
                </div>
            )}

            {isRateLimited && (
                <div className="mb-6 p-4 bg-orange-100 border-l-4 border-orange-500 text-orange-700 rounded-r shadow-sm">
                    <p className="font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 112 0 1 1 0 01-2 0zm-1 9a1 1 0 102 0v-6a1 1 0 10-2 0v6z" clipRule="evenodd" />
                        </svg>
                        Thông báo giới hạn API
                    </p>
                    <p className="text-sm mt-1">Dịch vụ đang tạm nghỉ để tránh quá tải. Vui lòng chờ vài phút rồi quay lại bài học.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto flex-grow px-2 pb-8 max-w-7xl mx-auto w-full">
                {localVocabulary.map((item, index) => {
                    const isPlaying = playingWord === item.word;
                    const isFetchingAudio = fetchingWords.has(item.word);
                    const isFetchingImage = fetchingImages.has(item.word);
                    const hasError = errorWords.has(item.word);
                    const bgColor = CARD_COLORS[index % CARD_COLORS.length];
                    const imageUrl = item.image || `https://image.pollinations.ai/prompt/${item.word.replace(/\s+/g, '_')}_illustration_white_background`;

                    return (
                        <div key={index} className={`${bgColor} rounded-[2rem] p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300`}>
                            <ImageWithLoader src={imageUrl} alt={item.word} isProcessing={isFetchingImage} />
                            <div className="text-center w-full mb-6">
                                <h2 className="text-2xl font-extrabold text-[#006064] mb-1">
                                    {item.word} <span className="text-lg text-[#E91E63]">({item.type})</span>
                                </h2>
                                <p className="text-[#00A0A0] font-bold text-lg font-serif mb-2">{item.phonetic}</p>
                                <p className="text-[#FF5252] font-bold text-xl">{item.translation}</p>
                                {item.example && (
                                    <div className="mt-4 px-2">
                                        <p className="text-[#8E44AD] font-bold text-xl font-['Patrick_Hand'] leading-snug break-words">
                                            <span className="italic opacity-80 mr-1 text-lg">ex:</span>
                                            {item.example}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={(e) => handlePlaySound(item, e)}
                                disabled={isFetchingAudio && !isPlaying}
                                className={`w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer relative ${isPlaying ? 'ring-4 ring-blue-200' : ''}`}
                            >
                                {isFetchingAudio ? (
                                    <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : hasError ? (
                                    <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 112 0 1 1 0 01-2 0zm-1 9a1 1 0 102 0v-6a1 1 0 10-2 0v6z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <div className="relative flex items-center justify-center">
                                        {isPlaying && <div className="absolute rounded-full border-2 border-blue-400 opacity-0 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] h-full w-full inset-0"></div>}
                                        <svg className={`h-8 w-8 ${isPlaying ? 'text-blue-600' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14.016 3.234q3.047 0.656 5.016 3.117t1.969 5.648-1.969 5.648-5.016 3.117v-2.063q2.203-0.656 3.586-2.484t1.383-4.219-1.383-4.219-3.586-2.484v-2.063zM16.5 12q0 2.813-2.484 4.031v-8.063q1.031 0.516 1.758 1.688t0.727 2.344zM3 9h3.984l5.016-5.016v16.031l-5.016-5.016h-3.984v-6z"></path>
                                        </svg>
                                    </div>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default VocabularyScreen;
