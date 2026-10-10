
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

// Version number manually updated whenever prompt or vocabulary is modified
export const QUIZ_VERSION = '3.2';

// Dictionary to correct specific pronunciation issues
const PRONUNCIATION_OVERRIDES: Record<string, string> = {
    "submit": "sub-MIT",
    "casual": "ca-sual",
};

/**
 * Model Priority Pools for distinct capabilities with fallback resilience.
 * Always aligned with official @google/genai guidelines.
 */
const MODEL_POOLS = {
    text: [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
    ],
    image: [
        'gemini-3.1-flash-lite-image',
        'gemini-2.5-flash-image',
    ],
    tts: [
        'gemini-3.8-flash-lite-tts',
        'gemini-3.8-flash-tts',
        'gemini-2.5-flash-preview-tts',
    ]
};

// In-memory record of model health/unavailability to avoid calling broken or deprecated models repeatedly
const disabledModels = new Set<string>();

/**
 * Creates an instance of GoogleGenAI configured with required headers.
 */
function getGenAIClient(): GoogleGenAI {
    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });
}

/**
 * Helper to clean and safely parse JSON strings from model outputs,
 * removing markdown fences, stray control characters, and line comments.
 */
function cleanAndParseJSON<T>(rawText: string): T {
    if (!rawText) {
        throw new Error("Empty text response from Gemini model.");
    }

    let cleaned = rawText.trim();
    
    // Strip markdown code blocks ```json ... ``` or ``` ... ```
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch (firstErr) {
        // Additional fallback cleanup: try removing trailing commas before ] or }
        try {
            const sanitized = cleaned.replace(/,\s*([\]}])/g, "$1");
            return JSON.parse(sanitized) as T;
        } catch (secondErr) {
            console.error("Failed to parse clean JSON. Raw content:", rawText);
            throw new Error(`JSON parse error: ${(firstErr as Error).message}`);
        }
    }
}

/**
 * Executes a Gemini API operation using model fallback hierarchy.
 * Automatically tries next model if a call fails (e.g. rate limit, 404, schema error).
 */
async function executeWithModelFallback<T>(
    category: 'text' | 'image' | 'tts',
    operation: (ai: GoogleGenAI, modelName: string) => Promise<T>
): Promise<T> {
    const ai = getGenAIClient();
    const candidateModels = MODEL_POOLS[category].filter(m => !disabledModels.has(m));
    const allModels = candidateModels.length > 0 ? candidateModels : MODEL_POOLS[category];

    let lastError: any = null;

    for (const modelName of allModels) {
        try {
            const result = await operation(ai, modelName);
            return result;
        } catch (error: any) {
            lastError = error;
            const errMsg = error?.message || String(error);
            console.warn(`[GeminiModelManager] Model '${modelName}' failed for '${category}': ${errMsg}`);

            // If error indicates invalid/deprecated model or resource not found, blacklist model in-memory
            if (
                errMsg.includes('404') || 
                errMsg.includes('not found') || 
                errMsg.includes('deprecated') || 
                errMsg.includes('unsupported')
            ) {
                disabledModels.add(modelName);
                console.warn(`[GeminiModelManager] Blacklisted model '${modelName}' for current session due to breaking error.`);
            }
        }
    }

    console.error(`[GeminiModelManager] All fallback models failed for category '${category}'.`);
    throw lastError || new Error(`All Gemini models failed for ${category}`);
}

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
    const fullPrompt = `You are an expert English teacher. Output strictly JSON. User request: ${prompt}`;
    
    return executeWithModelFallback('text', async (ai, modelName) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: quizSchema, 
                temperature: 0.5 
            },
        });

        const parsed = cleanAndParseJSON<{ questions: QuizQuestion[] }>(response.text || '');
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid response structure: 'questions' array missing");
        }

        const questions: QuizQuestion[] = parsed.questions;
        questions.forEach(q => {
            if (Array.isArray(q.options)) {
                q.options = shuffleArray([...q.options]);
            }
        });
        return questions;
    });
}

export async function generateQuizFromText(context: string): Promise<QuizQuestion[]> {
    const prompt = `Convert this text to quiz questions JSON: ${context}`;
    
    return executeWithModelFallback('text', async (ai, modelName) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: quizSchema, 
                temperature: 0.2 
            },
        });

        const parsed = cleanAndParseJSON<{ questions: QuizQuestion[] }>(response.text || '');
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid response structure: 'questions' array missing");
        }

        const questions: QuizQuestion[] = parsed.questions;
        questions.forEach(q => {
            if (Array.isArray(q.options)) {
                q.options = shuffleArray([...q.options]);
            }
        });
        return questions;
    });
}

export async function generateVocabularyList(prompt: string): Promise<VocabularyWord[]> {
    const fullPrompt = `Create a vocabulary list JSON. Instruction: ${prompt}`;
    
    return executeWithModelFallback('text', async (ai, modelName) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: vocabularyListSchema, 
                temperature: 0.3 
            },
        });

        const parsed = cleanAndParseJSON<{ vocabulary: VocabularyWord[] }>(response.text || '');
        if (!parsed.vocabulary || !Array.isArray(parsed.vocabulary)) {
            throw new Error("Invalid response structure: 'vocabulary' array missing");
        }

        return parsed.vocabulary;
    });
}

/**
 * Generates high quality 2D illustration image using Gemini Image generation.
 */
export async function generateImagePrompt(word: string, translation: string): Promise<string> {
    try {
        return await executeWithModelFallback('image', async (ai, modelName) => {
            const isNanoBanana = modelName.includes('nano-banana');
            const response = await ai.models.generateContent({
                model: modelName,
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
                    if (part.inlineData?.data) {
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }
            }
            throw new Error("No inlineData image content found in Gemini response");
        });
    } catch (error) {
        console.error("Gemini Image Gen fallback engaged:", error);
        const randomSeed = Math.floor(Math.random() * 1000000);
        const searchKeyword = encodeURIComponent(word.toLowerCase());
        return `https://loremflickr.com/800/600/${searchKeyword},illustration/all?lock=${randomSeed}`;
    }
}

/**
 * Text-to-speech generation with model fallback and seamless fallback to Web Speech API.
 */
export async function generateSpeech(text: string): Promise<string> {
    if (!text || !text.trim()) return '';
    
    const textToSpeak = PRONUNCIATION_OVERRIDES[(text || '').toLowerCase()] || text;
    const descriptivePrompt = `Please pronounce the following English word clearly and naturally: "${textToSpeak}"`;

    try {
        return await executeWithModelFallback('tts', async (ai, modelName) => {
            const isLegacyTTS = modelName.includes('2.5');
            const response = await ai.models.generateContent({
                model: modelName,
                contents: isLegacyTTS 
                    ? [{ parts: [{ text: descriptivePrompt }] }]
                    : [
                        {
                            role: "user",
                            parts: [{ text: descriptivePrompt }]
                        }
                    ],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { 
                        voiceConfig: { 
                            prebuiltVoiceConfig: { voiceName: 'Kore' } 
                        } 
                    },
                },
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) {
                throw new Error("No inline audio data returned from Gemini TTS");
            }
            return audioData;
        });
    } catch (error) {
        // Return empty string on rate limit or TTS failure to allow Web Speech API fallback seamlessly
        return '';
    }
}

