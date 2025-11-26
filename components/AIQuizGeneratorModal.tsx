import React, { useState, useEffect, useRef } from 'react';

interface AIQuizGeneratorModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => Promise<void>;
    isGenerating: boolean;
}

const DEFAULT_PROMPT = `Generate an English phonetics quiz for intermediate learners.
The quiz should include a mix of:
- "Pronunciation" questions: Find the word with the underlined part pronounced differently. The options should have <u> tags around the relevant phoneme.
- "Stress" questions: Find the word with the main stress on a different position.

For all questions, provide a Vietnamese translation and a detailed explanation in Vietnamese.`;

const AIQuizGeneratorModal: React.FC<AIQuizGeneratorModalProps> = ({ 
    show, 
    onClose, 
    onSubmit, 
    isGenerating,
}) => {
    const [questionCount, setQuestionCount] = useState(10);
    const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (show) {
            setTimeout(() => textareaRef.current?.focus(), 100);
            setError(null);
            setPrompt(DEFAULT_PROMPT);
            setQuestionCount(10);
        }
    }, [show]);

    const handleSubmit = async () => {
        setError(null);
        let fullPrompt = '';

        const count = Number(questionCount);
        if (isNaN(count) || count < 1 || count > 50) {
            setError('Số lượng câu hỏi phải là một số từ 1 đến 50.');
            return;
        }
        if (!prompt.trim()) {
            setError('Vui lòng nhập yêu cầu chi tiết để tạo đề.');
            return;
        }
        fullPrompt = `Generate a quiz with exactly ${count} questions based on the following instructions:\n\n${prompt}`;
        
        try {
            await onSubmit(fullPrompt);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Tạo đề thất bại. Vui lòng thử lại.');
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Tạo đề thi chung với A.I</h2>
                    <p className="text-sm text-gray-600">Chọn số lượng câu và viết yêu cầu chi tiết để A.I tạo ra bộ câu hỏi trắc nghiệm.</p>
                </div>
                <div className="p-4 flex-grow overflow-y-auto space-y-4">
                        <div>
                        <label htmlFor="question-count" className="block text-sm font-medium text-gray-700 mb-2">
                            Số lượng câu hỏi
                        </label>
                        <input
                            id="question-count"
                            type="number"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            min="1"
                            max="50"
                            className="w-full max-w-[150px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isGenerating}
                        />
                    </div>
                    <div>
                        <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                            Yêu cầu chi tiết
                        </label>
                        <textarea
                            ref={textareaRef}
                            id="ai-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ví dụ: Tạo các câu hỏi về thì hiện tại đơn..."
                            className="w-full h-56 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isGenerating}
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 font-semibold px-4 pb-2 text-center">{error}</p>}

                <div className="p-4 border-t flex justify-end items-center gap-4">
                    <button onClick={onClose} className="text-gray-600 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition" disabled={isGenerating}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isGenerating || !prompt.trim()}
                        className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>{isGenerating ? 'Đang tạo...' : 'Tạo đề'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIQuizGeneratorModal;