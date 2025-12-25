import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '../types';

interface EditVocabularyModalProps {
    vocabulary: VocabularyWord[];
    onClose: () => void;
    onSave: (editedVocab: VocabularyWord[]) => Promise<void>;
}

const EditVocabularyModal: React.FC<EditVocabularyModalProps> = ({ vocabulary, onClose, onSave }) => {
    const [editedVocab, setEditedVocab] = useState<VocabularyWord[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Deep copy to avoid mutating props directly
        setEditedVocab(JSON.parse(JSON.stringify(vocabulary || [])));
    }, [vocabulary]);

    const handleChange = (index: number, field: keyof VocabularyWord, value: string) => {
        const newList = [...editedVocab];
        newList[index] = { ...newList[index], [field]: value };
        setEditedVocab(newList);
    };

    const handleDelete = (index: number) => {
        const newList = editedVocab.filter((_, i) => i !== index);
        setEditedVocab(newList);
    };

    const handleAdd = () => {
        const newWord: VocabularyWord = {
            word: '',
            type: '',
            phonetic: '',
            translation: '',
            example: '',
            image: '',
            audio: ''
        };
        // Add to the beginning of the list for visibility
        setEditedVocab([newWord, ...editedVocab]);
    };

    const handleSave = async () => {
        // Basic validation: filter out empty words
        const cleanList = editedVocab.filter(v => v.word.trim() !== '');
        
        setIsSaving(true);
        try {
            await onSave(cleanList);
            onClose();
        } catch (error) {
            console.error("Failed to save vocabulary:", error);
            alert("Lưu thất bại. Vui lòng thử lại.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Chỉnh sửa Danh sách Từ vựng</h2>
                        <p className="text-sm text-gray-500">Tổng số từ: {editedVocab.length}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-gray-100">
                    <button 
                        onClick={handleAdd}
                        className="mb-4 w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 font-bold hover:bg-blue-50 transition flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Thêm từ mới
                    </button>

                    <div className="space-y-4">
                        {editedVocab.map((item, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="grid grid-cols-12 gap-3 w-full mb-3">
                                    <div className="col-span-12 sm:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Từ vựng (English)</label>
                                        <input 
                                            type="text" 
                                            value={item.word} 
                                            onChange={(e) => handleChange(index, 'word', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-400 font-bold text-gray-800"
                                            placeholder="Example"
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-1">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Loại</label>
                                        <input 
                                            type="text" 
                                            value={item.type} 
                                            onChange={(e) => handleChange(index, 'type', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 text-center"
                                            placeholder="n/v/adj"
                                        />
                                    </div>
                                    <div className="col-span-8 sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Phiên âm</label>
                                        <input 
                                            type="text" 
                                            value={item.phonetic} 
                                            onChange={(e) => handleChange(index, 'phonetic', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 font-mono text-sm"
                                            placeholder="/.../"
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nghĩa Tiếng Việt</label>
                                        <input 
                                            type="text" 
                                            value={item.translation} 
                                            onChange={(e) => handleChange(index, 'translation', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 text-blue-700 font-medium"
                                            placeholder="Ví dụ"
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-3 flex items-end gap-2">
                                         <div className="flex-grow">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Link Ảnh minh họa</label>
                                            <input 
                                                type="text" 
                                                value={item.image || ''} 
                                                onChange={(e) => handleChange(index, 'image', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 text-xs text-gray-500"
                                                placeholder="https://..."
                                            />
                                         </div>
                                         <button 
                                            onClick={() => handleDelete(index)}
                                            className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition mb-[1px]"
                                            title="Xóa từ này"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1-1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-semibold text-purple-700 mb-1">Câu ví dụ (Example sentence)</label>
                                    <input 
                                        type="text" 
                                        value={item.example || ''} 
                                        onChange={(e) => handleChange(index, 'example', e.target.value)}
                                        className="w-full p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-400 bg-purple-50 italic text-purple-900 font-bold"
                                        placeholder="ex: He always stays at home on Sunday."
                                    />
                                </div>
                            </div>
                        ))}
                        {editedVocab.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                Danh sách trống. Hãy thêm từ mới!
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
                        disabled={isSaving}
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-blue-400"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Đang lưu...</span>
                            </>
                        ) : (
                            <span>Lưu thay đổi</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditVocabularyModal;