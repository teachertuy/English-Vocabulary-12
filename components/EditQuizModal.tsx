import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';

interface EditQuizModalProps {
    questions: QuizQuestion[];
    onClose: () => void;
    onSave: (editedQuestions: QuizQuestion[]) => Promise<void>;
}

const EditQuizModal: React.FC<EditQuizModalProps> = ({ questions, onClose, onSave }) => {
    const [editedQuestions, setEditedQuestions] = useState<QuizQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Deep copy of questions to avoid mutating props
        setEditedQuestions(JSON.parse(JSON.stringify(questions)));
    }, [questions]);

    const handleQuestionChange = (index: number, field: 'sentence' | 'translation' | 'explanation', value: string) => {
        const newQuestions = [...editedQuestions];
        newQuestions[index][field] = value;
        setEditedQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
        const newQuestions = [...editedQuestions];
        const oldOptionValue = newQuestions[qIndex].options[optIndex];
        newQuestions[qIndex].options[optIndex] = value;
        // If the edited option was the answer, update the answer as well
        if (newQuestions[qIndex].answer === oldOptionValue) {
            newQuestions[qIndex].answer = value;
        }
        setEditedQuestions(newQuestions);
    };

    const handleAnswerSelect = (qIndex: number, newAnswer: string) => {
        const newQuestions = [...editedQuestions];
        newQuestions[qIndex].answer = newAnswer;
        setEditedQuestions(newQuestions);
    };

    const handleDeleteQuestion = (qIndex: number) => {
        const newQuestions = editedQuestions.filter((_, index) => index !== qIndex);
        setEditedQuestions(newQuestions);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editedQuestions);
        } catch (error) {
            console.error("Failed to save edited quiz:", error);
            // Optionally show an error message to the user
        } finally {
            setIsSaving(false);
        }
    };

    if (!questions || questions.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">Xem và Chỉnh sửa Đề thi</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-bold">&times;</button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6 bg-gray-50">
                    {editedQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="p-4 rounded-lg border bg-white shadow-sm relative">
                            <h3 className="font-bold text-lg text-gray-800 mb-3">Câu {qIndex + 1}</h3>
                            <button
                                onClick={() => handleDeleteQuestion(qIndex)}
                                className="absolute top-3 right-3 p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                                title="Xóa câu hỏi này"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Câu hỏi (tiếng Anh)</label>
                                    <textarea value={q.sentence} onChange={(e) => handleQuestionChange(qIndex, 'sentence', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" rows={2}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Các lựa chọn & Đáp án đúng</label>
                                    <div className="space-y-2">
                                        {q.options.map((opt, optIndex) => (
                                            <div key={optIndex} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name={`answer-${qIndex}`}
                                                    checked={q.answer === opt}
                                                    onChange={() => handleAnswerSelect(qIndex, opt)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dịch nghĩa (tiếng Việt)</label>
                                    <textarea value={q.translation} onChange={(e) => handleQuestionChange(qIndex, 'translation', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" rows={2}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giải thích (tiếng Việt)</label>
                                    <textarea value={q.explanation} onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" rows={3}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t flex justify-end items-center gap-4 sticky bottom-0 bg-white">
                     <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition" disabled={isSaving}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-wait"
                    >
                        {isSaving ? 'Đang lưu...' : 'Lưu và Sử dụng'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditQuizModal;
