
import React, { useEffect, useRef, useState } from 'react';
import { listenToUnitsStatusByGrade, listenToTopicsStatus, getUnitVocabularyByGrade, getTopicVocabulary, updateVocabularyImage, updateVocabularyAudio } from '../services/firebaseService';
import { generateImagePrompt, generateSpeech } from '../services/geminiService';
import { VocabularyWord, UnitsState } from '../types';

interface BackgroundSyncProps {
    classroomId: string;
    isEnabled: boolean;
}

/**
 * BackgroundSync component handles pre-generating images and audio for vocabulary
 * across all enabled units and topics.
 */
const BackgroundSync: React.FC<BackgroundSyncProps> = ({ classroomId, isEnabled }) => {
    const [unitsStatus, setUnitsStatus] = useState<UnitsState>({});
    const [topicsStatus, setTopicsStatus] = useState<UnitsState>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTask, setCurrentTask] = useState<string>('');
    const stopRef = useRef(false);

    useEffect(() => {
        if (!isEnabled) return;
        const unsubUnits = listenToUnitsStatusByGrade(classroomId, 12, setUnitsStatus);
        const unsubTopics = listenToTopicsStatus(classroomId, setTopicsStatus);
        return () => {
            unsubUnits();
            unsubTopics();
            stopRef.current = true;
        };
    }, [classroomId, isEnabled]);

    useEffect(() => {
        if (!isEnabled || isProcessing) return;

        const runSync = async () => {
            setIsProcessing(true);
            stopRef.current = false;

            try {
                // 1. Process Units 12
                const unitEntries = Object.entries(unitsStatus) as [string, { enabled: boolean }][];
                for (const [unitId, status] of unitEntries) {
                    if (stopRef.current) break;
                    if (status.enabled) {
                        const vocab = await getUnitVocabularyByGrade(classroomId, 12, unitId);
                        if (vocab && Array.isArray(vocab)) {
                            await processVocabList(vocab, 12, unitId);
                        }
                    }
                }

                // 2. Process Topics
                const topicEntries = Object.entries(topicsStatus) as [string, { enabled: boolean }][];
                for (const [topicId, status] of topicEntries) {
                    if (stopRef.current) break;
                    if (status.enabled) {
                        const vocab = await getTopicVocabulary(classroomId, topicId);
                        if (vocab && Array.isArray(vocab)) {
                            await processVocabList(vocab, 'topics', topicId);
                        }
                    }
                }
            } catch (error) {
                console.error("Background sync error:", error);
            } finally {
                setIsProcessing(false);
                setCurrentTask('');
            }
        };

        const processVocabList = async (vocab: VocabularyWord[], grade: number | 'topics', unitId: string) => {
            for (const item of vocab) {
                if (stopRef.current) break;

                let updated = false;
                
                // Check missing image
                if (!item.image || item.image.includes('illustration_white_background')) {
                    setCurrentTask(`Generating image for: ${item.word} (${unitId})`);
                    try {
                        const imageUrl = await generateImagePrompt(item.word, item.translation);
                        await updateVocabularyImage(classroomId, grade, unitId, item.word, imageUrl);
                        updated = true;
                        // Small delay after successful API call
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (e) {
                        console.error(`Failed to sync image for ${item.word}:`, e);
                        await new Promise(r => setTimeout(r, 5000)); // Longer delay on error
                    }
                }

                // Check missing audio
                if (!item.audio) {
                    setCurrentTask(`Generating audio for: ${item.word} (${unitId})`);
                    try {
                        const audioBase64 = await generateSpeech(item.word);
                        await updateVocabularyAudio(classroomId, grade, unitId, item.word, audioBase64);
                        updated = true;
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (e) {
                        console.error(`Failed to sync audio for ${item.word}:`, e);
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }

                if (updated && stopRef.current) break;
            }
        };

        // Start sync after a short delay
        const timer = setTimeout(runSync, 5000);
        return () => {
            clearTimeout(timer);
            stopRef.current = true;
        };
    }, [unitsStatus, topicsStatus, isEnabled]);

    if (!isEnabled || !currentTask) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur shadow-lg rounded-xl p-3 border border-indigo-100 z-[200] flex items-center gap-3 animate-fade-in">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
            <div className="text-xs font-bold text-indigo-800">
                <p className="opacity-70 uppercase tracking-tighter text-[10px]">Background Sync</p>
                <p className="truncate max-w-[200px]">{currentTask}</p>
            </div>
        </div>
    );
};

export default BackgroundSync;
