
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabularyWord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// This version number should be manually updated whenever the prompt or vocabulary is significantly changed.
export const QUIZ_VERSION = '3.0';

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sentence: { type: Type.STRING, description: 'An English sentence or instruction for the question.' },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of 4 strings representing the multiple choice options. For pronunciation, options may contain <u> tags.' },
                    answer: { type: Type.STRING, description: 'The correct option from the options array.' },
                    translation: { type: Type.STRING, description: 'The Vietnamese translation of the question sentence.' },
                    explanation: { type: Type.STRING, description: 'A detailed explanation in Vietnamese about why the answer is correct, focusing on phonetics, grammar, or vocabulary.' }
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
                    word: { type: Type.STRING, description: 'The English word.' },
                    type: { type: Type.STRING, description: 'The word type (e.g., n, v, adj).' },
                    phonetic: { type: Type.STRING, description: 'The phonetic transcription of the word.' },
                    translation: { type: Type.STRING, description: 'The Vietnamese translation of the word.' }
                },
                required: ['word', 'type', 'phonetic', 'translation']
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
    const fullPrompt = `You are an expert English teacher tasked with creating a quiz based on a user's request.
    Your output MUST be a JSON object that strictly adheres to the provided schema.
    Do not add any extra text or explanations outside of the JSON structure.
    The questions should be high-quality, multiple-choice questions suitable for English learners.

    User's request:
    """
    ${prompt}
    """
    `;

    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: quizSchema,
                    temperature: 0.5,
                },
            });
            
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            
            if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
                throw new Error("Invalid format for generated questions. The AI could not parse the user's request into a valid quiz.");
            }

            const questions: QuizQuestion[] = parsed.questions;
            questions.forEach(q => {
                q.options = shuffleArray(q.options);
            });

            return questions;

        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1} to generate from custom prompt failed. Retrying...`);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
            }
        }
    }
    
    console.error("Error generating questions from custom prompt after multiple retries:", lastError);
    throw new Error("Could not generate quiz questions from the provided request. Please check your prompt and try again.");
}


export async function generateQuizFromText(context: string): Promise<QuizQuestion[]> {
    const prompt = `You are an expert English teacher tasked with formatting a quiz.
    The user will provide a block of text containing one or more multiple-choice questions. Your job is to parse this text and convert EACH question into a specific JSON object format.
    The number of questions in your final JSON output MUST EXACTLY MATCH the number of questions found in the provided text. Do not invent new questions or skip any.

    Provided Text:
    """
    ${context}
    """

    For EACH question you identify in the text, you MUST follow these strict rules:
    1.  'sentence': Extract the question's sentence. If there's a blank like '______', preserve it.
    2.  'options': Extract the multiple-choice options and format them into an array of 4 strings.
    3.  'answer': Identify and extract the correct answer from the options.
    4.  'translation': Provide a Vietnamese translation of the complete, correct English sentence (fill in the blank if necessary).
    5.  'explanation': Provide a detailed explanation in Vietnamese explaining why the answer is correct, focusing on grammar or vocabulary. If the source text provides clues for an explanation, use them.
    `;

    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: quizSchema,
                    temperature: 0.2, // Lower temperature for more deterministic parsing
                },
            });
            
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            
            if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
                 throw new Error("Invalid format for generated questions from text. The AI could not parse the input.");
            }

            const questions: QuizQuestion[] = parsed.questions;
            // Keep the user-defined order of questions, but shuffle the options within each question.
            questions.forEach(q => {
                q.options = shuffleArray(q.options);
            });

            return questions;

        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1} to generate from text failed. Retrying...`);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
            }
        }
    }
    
    console.error("Error generating questions from text after multiple retries:", lastError);
    throw new Error("Could not generate quiz questions from the provided text. Please check the format of your input text and try again.");
}


export async function generateVocabularyList(prompt: string): Promise<VocabularyWord[]> {
    const fullPrompt = `You are an expert English teacher tasked with creating a vocabulary list based on a user's request.
    Your output MUST be a JSON object that strictly adheres to the provided schema.
    Do not add any extra text or explanations outside of the JSON structure.
    The vocabulary items should be parsed correctly from the user's input.

    User's request:
    """
    ${prompt}
    """
    `;

    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: vocabularyListSchema,
                    temperature: 0.3,
                },
            });
            
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            
            if (!parsed.vocabulary || !Array.isArray(parsed.vocabulary)) {
                throw new Error("Invalid format for generated vocabulary. The AI could not parse the user's request into a valid list.");
            }
            
            return parsed.vocabulary;

        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1} to generate vocabulary list failed. Retrying...`);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
            }
        }
    }
    
    console.error("Error generating vocabulary list after multiple retries:", lastError);
    throw new Error("Could not generate vocabulary list from the provided request. Please check your vocabulary and prompt, then try again.");
}


export async function generateSpeech(text: string): Promise<string> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            // Kore is a standard US English voice. Other options: Puck, Charon, Zephyr, Fenrir for different accents.
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (!base64Audio) {
                throw new Error("No audio data returned from API.");
            }
            return base64Audio;

        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1} to generate speech for "${text}" failed. Retrying...`);
            if (attempt < MAX_RETRIES - 1) {
                const apiError = error as any;
                // Directly check the nested error object properties, which is more reliable than stringifying.
                if (apiError?.error?.code === 429 || apiError?.error?.status === 'RESOURCE_EXHAUSTED') {
                    break; // Exit retry loop immediately
                }
                await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF_MS * Math.pow(2, attempt)));
            }
        }
    }
    
    console.error(`Error generating speech for "${text}" after multiple retries:`, lastError);
    // Re-throw the original error to preserve its properties for inspection in the UI component.
    if (lastError) {
        throw lastError;
    }
    throw new Error(`Could not generate speech for "${text}". Please try again.`);
}
