
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VocabularyWord } from '../types';
import { generateSpeech } from '../services/geminiService';
import { updateVocabularyAudio } from '../services/firebaseService';

// --- Audio Helper Functions (as per Gemini Live API guidelines) ---

// Decodes a base64 string into a Uint8Array.
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM audio data into an AudioBuffer for playback.
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

// Background colors to cycle through, matching the reference image (Pink, Blue, Green)
const CARD_COLORS = [
    'bg-[#FFF0F0]', // Pastel Pink
    'bg-[#F0F8FF]', // Pastel Blue
    'bg-[#F0FFF4]'  // Pastel Green
];

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
    const [errorWord, setErrorWord] = useState<string | null>(null);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Sync local state if prop changes (e.g. initial load or update)
    useEffect(() => {
        setLocalVocabulary(vocabulary);
    }, [vocabulary]);

    const handlePlaySound = useCallback(async (wordItem: VocabularyWord, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering parent click events
        if (playingWord || isRateLimited) return;

        try {
            setPlayingWord(wordItem.word);
            setErrorWord(null);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            let audioBuffer: AudioBuffer;
            let base64Audio = wordItem.audio;

            if (!base64Audio) {
                // Not in cache, generate it
                base64Audio = await generateSpeech(wordItem.word);
                // Save to Firebase for future use (fire and forget)
                const unitIdentifier = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
                updateVocabularyAudio(classroomId, grade, unitIdentifier, wordItem.word, base64Audio).catch(err => console.error("Failed to cache audio", err));
                
                // Update local state so subsequent clicks use cached version immediately
                setLocalVocabulary(prev => prev.map(w => w.word === wordItem.word ? { ...w, audio: base64Audio } : w));
            }

            const decodedBytes = decode(base64Audio!);
            audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            
            source.onended = () => {
                setPlayingWord(currentPlaying => (currentPlaying === wordItem.word ? null : currentPlaying));
            };

        } catch (error: any) {
            console.error("Failed to play sound:", error);
            const apiError = error as any;
            
            if (apiError?.error?.code === 429 || apiError?.error?.status === 'RESOURCE_EXHAUSTED') {
                setIsRateLimited(true);
            } else {
                setErrorWord(wordItem.word);
                setTimeout(() => {
                     setErrorWord(current => (current === wordItem.word ? null : current));
                }, 3000);
            }
            setPlayingWord(currentPlaying => (currentPlaying === wordItem.word ? null : currentPlaying));
        }
    }, [playingWord, isRateLimited, classroomId, grade, unitNumber]);
    
    return (
        <div className="flex flex-col p-4 sm:p-6 bg-[#FFF8F0] min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
                 <button onClick={onBack} className="group flex items-center text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors focus:outline-none rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>
                 <h1 className="text-2xl font-extrabold text-center text-gray-800 uppercase tracking-wide">
                    {grade === 'topics' ? `Topic ${unitNumber}` : `Unit ${unitNumber}`} Vocabulary
                </h1>
                <div className="w-20"></div> 
            </div>

            {isRateLimited && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md mx-auto max-w-2xl" role="alert">
                    <p className="font-bold">Đã đạt đến giới hạn API</p>
                    <p>Bạn đã vượt quá số lượng yêu cầu phát âm miễn phí cho hôm nay. Vui lòng thử lại sau.</p>
                </div>
            )}

            {localVocabulary.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto flex-grow px-2 pb-8 max-w-7xl mx-auto w-full">
                    {localVocabulary.map((item, index) => {
                        const isPlaying = playingWord === item.word;
                        const hasError = errorWord === item.word;
                        
                        // Cycle through backgrounds
                        const bgColor = CARD_COLORS[index % CARD_COLORS.length];

                        // Use provided image URL or fallback
                        const imageUrl = item.image || `https://image.pollinations.ai/prompt/${item.word.replace(/\s+/g, '_')}_illustration_white_background`;

                        return (
                            <div 
                                key={index}
                                className={`${bgColor} rounded-[2rem] p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300`}
                            >
                                {/* Image Container */}
                                <div className="w-40 h-40 bg-white rounded-2xl shadow-sm p-3 mb-4 flex items-center justify-center">
                                     <img 
                                        src={imageUrl} 
                                        alt={item.word} 
                                        className="max-h-full max-w-full object-contain rounded-xl"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/150?text=${item.word}`;
                                        }}
                                    />
                                </div>

                                {/* Text Content */}
                                <div className="text-center w-full mb-6">
                                    <h2 className="text-2xl font-extrabold text-[#006064] mb-1">
                                        {item.word} <span className="text-lg text-[#E91E63]">({item.type})</span>
                                    </h2>
                                    <p className="text-[#00A0A0] font-bold text-lg font-serif mb-2">{item.phonetic}</p>
                                    <p className="text-[#FF5252] font-bold text-xl">{item.translation}</p>
                                </div>

                                {/* Audio Button */}
                                <button 
                                    onClick={(e) => handlePlaySound(item, e)}
                                    disabled={isRateLimited}
                                    className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                    aria-label={`Listen to ${item.word}`}
                                >
                                    {isPlaying ? (
                                        <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : hasError ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                         <p className="text-gray-500 text-lg">Không có từ vựng nào cho bài học này.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocabularyScreen;
