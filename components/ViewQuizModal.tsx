import React from 'react';
import { SavedQuiz } from '../types';

interface ViewQuizModalProps {
    quiz: SavedQuiz | null;
    onClose: () => void;
}

const ViewQuizModal: React.FC<ViewQuizModalProps> = ({ quiz, onClose }) => {
    if (!quiz) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-800">Xem đề: {quiz.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    {quiz.questions.map((q, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-gray-50">
                            <p className="font-bold text-gray-900 mb-2">Câu {index + 1}: <span className="font-normal">{q.sentence}</span></p>
                            <ul className="list-disc list-inside mt-2 pl-2 space-y-1">
                                {q.options.map((option, i) => (
                                    <li key={i} className={`${option === q.answer ? 'font-bold text-green-700' : 'text-gray-700'}`} dangerouslySetInnerHTML={{ __html: option }}></li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t text-right sticky bottom-0 bg-white">
                    <button onClick={onClose} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition shadow-md">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewQuizModal;
