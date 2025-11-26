import React, { useState, useEffect, useRef } from 'react';

interface SaveQuizModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    isSaving: boolean;
}

const SaveQuizModal: React.FC<SaveQuizModalProps> = ({ show, onClose, onSave, isSaving }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setName('');
        }
    }, [show]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };
    
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Lưu đề thi</h2>
                    <p className="text-sm text-gray-600">Đặt tên cho đề thi hiện tại để sử dụng lại sau này.</p>
                </div>
                <div className="p-5">
                    <label htmlFor="quiz-name" className="block text-sm font-medium text-gray-700 mb-2">Tên đề thi</label>
                    <input
                        ref={inputRef}
                        id="quiz-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Ví dụ: Đề giữa kỳ ${new Date().getFullYear()}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                        onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                    />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition" disabled={isSaving}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || isSaving}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-wait"
                    >
                        {isSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveQuizModal;
