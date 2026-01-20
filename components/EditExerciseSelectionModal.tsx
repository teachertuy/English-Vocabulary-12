
import React, { useState, useEffect } from 'react';
import { ExerciseSelectionConfig } from '../types';

interface EditExerciseSelectionModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: ExerciseSelectionConfig) => Promise<void>;
    currentConfig: ExerciseSelectionConfig | null;
}

const DEFAULT_CONFIG: ExerciseSelectionConfig = {
    mainTitle: 'TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ',
    mainTitleFontSize: 1.875,
    mainTitleColor: '#dc2626',
    card1Title: 'English 12',
    card1Icon: '📝',
    card1Color: '#3b82f6',
    card2Title: 'Topic-based vocabulary',
    card2Icon: '📰',
    card2Color: '#a855f7',
    cardFontSize: 1.5,
    cardHeight: 10,
    cardBorderRadius: 16,
};

const EditExerciseSelectionModal: React.FC<EditExerciseSelectionModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<ExerciseSelectionConfig>(currentConfig || DEFAULT_CONFIG);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setConfig(currentConfig || DEFAULT_CONFIG);
        }
    }, [show, currentConfig]);

    const handleChange = (field: keyof ExerciseSelectionConfig, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(config);
            onClose();
        } catch (error) {
            console.error("Failed to save exercise selection config:", error);
            alert("Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[120] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-gray-800">Thiết kế màn hình chọn bài tập HS</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    {/* Main Title Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-red-700 border-b pb-2">Tiêu đề chính</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Màu chữ</label>
                                <input type="color" value={config.mainTitleColor} onChange={e => handleChange('mainTitleColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ: <span className="text-red-600">{config.mainTitleFontSize}rem</span></label>
                                <input type="range" min="1" max="4" step="0.1" value={config.mainTitleFontSize} onChange={e => handleChange('mainTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600" />
                            </div>
                        </div>
                    </div>

                    {/* Common Card Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-700 border-b pb-2">Kích thước & Bo góc Card (Chung)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ Card: <span className="text-blue-600">{config.cardFontSize}rem</span></label>
                                <input type="range" min="1" max="3" step="0.1" value={config.cardFontSize} onChange={e => handleChange('cardFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Chiều cao Card: <span className="text-blue-600">{config.cardHeight}rem</span></label>
                                <input type="range" min="5" max="25" step="1" value={config.cardHeight} onChange={e => handleChange('cardHeight', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Độ bo góc: <span className="text-blue-600">{config.cardBorderRadius}px</span></label>
                                <input type="range" min="0" max="60" step="2" value={config.cardBorderRadius} onChange={e => handleChange('cardBorderRadius', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Specific Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-xl bg-blue-50">
                            <h4 className="font-bold text-blue-800 mb-3">Card 1 (Bên trái)</h4>
                            <div className="space-y-3">
                                <input type="text" value={config.card1Title} onChange={e => handleChange('card1Title', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Tên hiển thị" />
                                <input type="color" value={config.card1Color} onChange={e => handleChange('card1Color', e.target.value)} className="w-full h-8 p-0 border-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="p-4 border rounded-xl bg-purple-50">
                            <h4 className="font-bold text-purple-800 mb-3">Card 2 (Bên phải)</h4>
                            <div className="space-y-3">
                                <input type="text" value={config.card2Title} onChange={e => handleChange('card2Title', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Tên hiển thị" />
                                <input type="color" value={config.card2Color} onChange={e => handleChange('card2Color', e.target.value)} className="w-full h-8 p-0 border-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition" disabled={isSaving}>Hủy bỏ</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:bg-blue-400">
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditExerciseSelectionModal;
