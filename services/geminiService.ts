
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const QUIZ_VERSION = '3.2';

// ... (giữ nguyên quizSchema, vocabularyListSchema, PRONUNCIATION_OVERRIDES, shuffleArray)

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

const PRONUNCIATION_OVERRIDES: Record<string, string> = {
    "submit": "sub-MIT",
    "casual": "ca-sual",
};

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function generateQuizFromCustomPrompt(prompt: string): Promise<QuizQuestion[]> {
    const fullPrompt = `You are an expert English teacher. Create a quiz based on: "${prompt}". Output strictly JSON per schema.`;
    try {
        // FIX: Using recommended gemini-3-flash-preview model
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
    const prompt = `Parse these multiple-choice questions into JSON: "${context}".`;
    try {
        // FIX: Using recommended gemini-3-flash-preview model
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
    const fullPrompt = `Create a vocabulary list based on: "${prompt}". Focus images on Vietnamese meaning. Output strictly JSON.`;
    try {
        // FIX: Using recommended gemini-3-flash-preview model
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
 * TẠO MÔ TẢ HÌNH ẢNH CHUYÊN SÂU
 * Giúp AI tạo ảnh hiểu rõ ngữ cảnh của từ vựng
 */
export async function generateImagePrompt(word: string, translation: string): Promise<string> {
    const prompt = `You are a professional AI image prompt engineer. 
    Create a detailed visual description for the English word "${word}" (Vietnamese meaning: "${translation}").
    The image should be: Photorealistic, high resolution, isolated on a clean plain white background, centered composition, high contrast, educational style.
    Avoid any text or letters in the image.
    Return ONLY the final URL in this format: https://image.pollinations.ai/prompt/{detailed_description}?width=800&height=600&nologo=true
    In {detailed_description}, replace spaces with underscores and focus on the visual elements.`;

    try {
        // FIX: Using recommended gemini-3-flash-preview model
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0.4 },
        });
        const text = response.text.trim();
        return text.startsWith('http') ? text : `https://image.pollinations.ai/prompt/${word.replace(/\s+/g, '_')}_illustrating_${translation.replace(/\s+/g, '_')}?width=800&height=600&nologo=true`;
    } catch (error) {
        return `https://image.pollinations.ai/prompt/${word.replace(/\s+/g, '_')}_isolated_on_white_background?width=800&height=600&nologo=true`;
    }
}

export async function generateSpeech(text: string): Promise<string> {
    const textToSpeak = PRONUNCIATION_OVERRIDES[text.toLowerCase()] || text;
    const descriptivePrompt = `Please pronounce the following English word clearly: "${textToSpeak}"`;
    try {
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
        console.error("TTS error:", error);
        throw error;
    }
}
