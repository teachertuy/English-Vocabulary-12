
import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Current version of the quiz logic
export const QUIZ_VERSION = '1.0.0';

// Schema for multiple choice quiz questions
const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      sentence: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.STRING },
      translation: { type: Type.STRING },
      explanation: { type: Type.STRING },
    },
    required: ['sentence', 'options', 'answer', 'translation', 'explanation'],
  }
};

// Schema for vocabulary words
const vocabSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      type: { type: Type.STRING },
      phonetic: { type: Type.STRING },
      translation: { type: Type.STRING },
      example: { type: Type.STRING },
    },
    required: ['word', 'type', 'phonetic', 'translation'],
  }
};

/**
 * Generates a quiz based on a teacher's custom instruction.
 */
export async function generateQuizFromCustomPrompt(prompt: string): Promise<QuizQuestion[]> {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: quizSchema,
        },
    });
    return JSON.parse(response.text || '[]');
}

/**
 * Generates a quiz from a provided context text.
 */
export async function generateQuizFromText(text: string): Promise<QuizQuestion[]> {
    const prompt = `Generate a high-quality educational multiple-choice quiz based on the following content: ${text}. Ensure each question has a translation and explanation in Vietnamese.`;
    return generateQuizFromCustomPrompt(prompt);
}

/**
 * Parses and generates a structured vocabulary list from a teacher's prompt.
 */
export async function generateVocabularyList(prompt: string): Promise<VocabularyWord[]> {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: vocabSchema,
        },
    });
    return JSON.parse(response.text || '[]');
}

/**
 * Transforms a word or sentence into speech (PCM audio base64).
 */
export async function generateSpeech(text: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
}

/**
 * Generates an image prompt for a vocabulary word and returns a Pollinations AI URL.
 */
export async function generateImagePrompt(word: string, translation: string): Promise<string> {
    const prompt = `You are an expert at creating visual prompts for AI image generators.
    Create a highly detailed, clear, and educational visual description in English for the word: "${word}" 
    based on its Vietnamese meaning: "${translation}".
    The image should be isolated on a clean white background, photorealistic, and suitable for students.
    Return ONLY the constructed URL in this format: 
    https://image.pollinations.ai/prompt/{description}?width=800&height=600&nologo=true
    In {description}, replace spaces with underscores.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0.4 },
        });
        const text = response.text || '';
        if (text.startsWith('http')) {
            return text.trim();
        }
        throw new Error("Invalid URL returned");
    } catch (error) {
        console.error("Failed to generate image prompt:", error);
        // Fallback to basic prompt
        const safeWord = word.replace(/\s+/g, '_');
        return `https://image.pollinations.ai/prompt/${safeWord}_illustration_white_background?width=800&height=600&nologo=true`;
    }
}
