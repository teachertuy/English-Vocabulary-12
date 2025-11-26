
import React, { useState, useRef, useCallback } from 'react';
import { VocabularyWord } from '../types';
import { generateSpeech } from '../services/geminiService';

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


interface VocabularyScreenProps {
  unitNumber: number;
  vocabulary: VocabularyWord[];
  onBack: () => void;
}

const VocabularyScreen: React.FC<VocabularyScreenProps> = ({ unitNumber, vocabulary, onBack }) => {
    const [playingWord, setPlayingWord] = useState<string | null>(null);
    const [errorWord, setErrorWord] = useState<string | null>(null);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const audioCache = useRef<Map<string, AudioBuffer>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);

    const handlePlaySound = useCallback(async (word: VocabularyWord) => {
        if (playingWord || isRateLimited) return;

        try {
            setPlayingWord(word.word);
            setErrorWord(null);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            let audioBuffer: AudioBuffer;

            if (audioCache.current.has(word.word)) {
                audioBuffer = audioCache.current.get(word.word)!;
            } else {
                const base64Audio = await generateSpeech(word.word);
                const decodedBytes = decode(base64Audio);
                audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
                audioCache.current.set(word.word, audioBuffer);
            }

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            
            source.onended = () => {
                setPlayingWord(currentPlaying => (currentPlaying === word.word ? null : currentPlaying));
            };

        } catch (error: any) {
            console.error("Failed to play sound:", error);
            const apiError = error as any;
            
            // Directly check the nested error object for a quota error. This is more robust
            // than stringifying, as the error structure is known from the API logs.
            if (apiError?.error?.code === 429 || apiError?.error?.status === 'RESOURCE_EXHAUSTED') {
                setIsRateLimited(true);
            } else {
                setErrorWord(word.word);
                setTimeout(() => {
                     setErrorWord(current => (current === word.word ? null : current));
                }, 3000);
            }
            setPlayingWord(currentPlaying => (currentPlaying === word.word ? null : currentPlaying));
        }
    }, [playingWord, isRateLimited]);
    
    return (
        <div className="flex flex-col p-4 sm:p-6 bg-gray-100 min-h-[600px]">
            <div className="flex items-center justify-between mb-4">
                 <button onClick={onBack} className="group flex items-center text-blue-600 font-bold text-lg hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="border-b-2 border-current pb-0.5">Back</span>
                </button>
                 <h1 className="text-2xl font-bold text-center text-gray-800">
                    <span className="text-orange-500">Danh sách từ vựng</span> - UNIT {unitNumber}
                </h1>
                <div className="w-24"></div> 
            </div>

            {isRateLimited && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                    <p className="font-bold">Đã đạt đến giới hạn API</p>
                    <p>Bạn đã vượt quá số lượng yêu cầu phát âm miễn phí cho hôm nay. Vui lòng thử lại sau.</p>
                </div>
            )}

            {vocabulary.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-grow pr-2">
                    {vocabulary.map((item, index) => {
                        const isPlaying = playingWord === item.word;
                        const hasError = errorWord === item.word;
                        return (
                            <div 
                                key={index}
                                onClick={isRateLimited ? undefined : () => handlePlaySound(item)}
                                className={`bg-white rounded-lg shadow-md p-5 flex flex-col justify-between relative border border-gray-200 transition-colors duration-200 ${isRateLimited ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'}`}
                                role="button"
                                tabIndex={isRateLimited ? -1 : 0}
                                aria-label={`Phát âm từ ${item.word}`}
                                aria-disabled={isRateLimited}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                         <h2 className="text-2xl font-bold text-red-600">{item.word}</h2>
                                        <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                                            {item.type}
                                        </div>
                                    </div>
                                    <p className="text-gray-500 italic mb-4">{item.phonetic}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-green-700 font-semibold text-lg">{item.translation}</p>
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {isPlaying ? (
                                             <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : hasError ? (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Lỗi phát âm">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-lg shadow-inner">
                    <p className="text-gray-600 text-lg">Không có từ vựng nào cho bài học này.</p>
                </div>
            )}
        </div>
    );
};

export default VocabularyScreen;
