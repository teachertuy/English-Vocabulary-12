
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

// This version number should be manually updated whenever the prompt or vocabulary is significantly changed.
export const QUIZ_VERSION = '3.1';

// Dictionary to correct specific pronunciation issues
const PRONUNCIATION_OVERRIDES: Record<string, string> = {
    "submit": "sub-MIT",
    "casual": "ca-sual",
};

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sentence: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                },
                required: ['sentence', 'options', 'answer', 'translation', 'explanation']
            }
        }
    },
    required: ['questions']
};

const vocabularyListSchema = {
    type: Type.OBJECT,
    properties: {
        vocabulary: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    type: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    image: { type: Type.STRING },
                    audio: { type: Type.STRING },
                    example: { type: Type.STRING }
                },
                required: ['word', 'type', 'phonetic', 'translation', 'image', 'example']
            }
        }
    },
    required: ['vocabulary']
};


function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export async function generateQuizFromCustomPrompt(prompt: string): Promise<QuizQuestion[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = `You are an expert English teacher. Output strictly JSON. User request: ${prompt}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: { responseMimeType: "application/json", responseSchema: quizSchema, temperature: 0.5 },
        });
        const parsed = JSON.parse(response.text.trim());
        const questions: QuizQuestion[] = parsed.questions;
        questions.forEach(q => q.options = shuffleArray(q.options));
        return questions;
    } catch (error) {
        console.error("Quiz gen error:", error);
        throw error;
    }
}

export async function generateQuizFromText(context: string): Promise<QuizQuestion[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Convert this text to quiz questions JSON: ${context}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: quizSchema, temperature: 0.2 },
        });
        const parsed = JSON.parse(response.text.trim());
        const questions: QuizQuestion[] = parsed.questions;
        questions.forEach(q => q.options = shuffleArray(q.options));
        return questions;
    } catch (error) {
        console.error("Quiz text gen error:", error);
        throw error;
    }
}

export async function generateVocabularyList(prompt: string): Promise<VocabularyWord[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = `Create a vocabulary list JSON. Instruction: ${prompt}`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: { responseMimeType: "application/json", responseSchema: vocabularyListSchema, temperature: 0.3 },
        });
        return JSON.parse(response.text.trim()).vocabulary;
    } catch (error) {
        console.error("Vocab list gen error:", error);
        throw error;
    }
}

/**
 * Tạo hình ảnh minh họa 2D chất lượng cao sử dụng Gemini 2.5 Flash Image.
 * Đây là cách tốt nhất để có ảnh chính xác cho từng từ vựng.
 */
export async function generateImagePrompt(word: string, translation: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
        // Sử dụng gemini-2.5-flash-image để tạo ảnh trực tiếp (chất lượng cao và chính xác)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `A simple, clear 2D flat vector illustration for children's education showing: "${word}" (meaning: ${translation}). Style: clean lines, vibrant colors, white background, centered, no text, professional clip-art style.`,
                    },
                ],
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                }
            }
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        
        throw new Error("No inlineData found in Gemini response");
    } catch (error) {
        console.error("Gemini Image Gen failed, using unique fallback:", error);
        // Fallback sang nguồn ảnh ngoài nhưng thêm tham số ngẫu nhiên để tránh trùng lặp
        // Sử dụng từ khóa tiếng Anh trực tiếp để tìm kiếm chính xác hơn
        const randomSeed = Math.floor(Math.random() * 1000000);
        const searchKeyword = encodeURIComponent(word.toLowerCase());
        return `https://loremflickr.com/800/600/${searchKeyword},illustration/all?lock=${randomSeed}`;
    }
}

export async function generateSpeech(text: string): Promise<string> {
    if (!text || !text.trim()) return '';
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const textToSpeak = PRONUNCIATION_OVERRIDES[(text || '').toLowerCase()] || text;
        const descriptivePrompt = `Please pronounce the following English word clearly and naturally: "${textToSpeak}"`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: descriptivePrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (error) {
        // Return empty string on rate limit or TTS failure to allow Web Speech API fallback seamlessly
        return '';
    }
}
