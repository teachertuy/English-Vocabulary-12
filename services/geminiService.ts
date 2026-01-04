
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function generateQuizFromCustomPrompt(prompt: string): Promise<QuizQuestion[]> {
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
 * Tạo mô tả hình ảnh chất lượng cao để Pollinations AI vẽ chuẩn hơn
 */
export async function generateImagePrompt(word: string, translation: string): Promise<string> {
    const prompt = `You are a professional visual prompt engineer for educational materials. 
    Create a highly detailed, clear, and educational visual description for the English word: "${word}" (meaning in Vietnamese: "${translation}").
    The description should focus on illustrating the Vietnamese meaning exactly.
    The image must be photorealistic, centered, on a clean white background, with no text.
    Return ONLY the final Pollinations AI URL in this format: 
    https://image.pollinations.ai/prompt/{detailed_visual_description}?width=800&height=600&nologo=true
    In {detailed_visual_description}, replace spaces with underscores.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0.4 },
        });
        const text = response.text.trim();
        return text.startsWith('http') ? text : `https://image.pollinations.ai/prompt/${word.replace(/\s+/g, '_')}_illustrating_${translation.replace(/\s+/g, '_')}?width=800&height=600&nologo=true`;
    } catch (error) {
        console.error("Image prompt gen error:", error);
        return `https://image.pollinations.ai/prompt/${word.replace(/\s+/g, '_')}_educational_illustration?width=800&height=600&nologo=true`;
    }
}

export async function generateSpeech(text: string): Promise<string> {
    const textToSpeak = PRONUNCIATION_OVERRIDES[text.toLowerCase()] || text;
    const descriptivePrompt = `Please pronounce the following English word clearly and naturally: "${textToSpeak}"`;
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
