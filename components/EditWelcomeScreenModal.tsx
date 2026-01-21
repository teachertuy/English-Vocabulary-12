
import React, { useState, useEffect } from 'react';
import { WelcomeScreenConfig } from '../types';

interface EditWelcomeScreenModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: WelcomeScreenConfig) => Promise<void>;
    currentConfig: WelcomeScreenConfig | null;
}

const DEFAULT_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY 12',
    titleFontSize: 1.8,
    titleFontSizeLine2: 1.6,
    titleColor: '#facc15',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputNamePlaceholder: 'Nhập họ và tên của bạn..',
    inputClassWidth: 10,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
    inputClassPlaceholder: 'Lớp...',
    startButtonText: 'START'
};

const EditWelcomeScreenModal: React.FC<EditWelcomeScreenModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<WelcomeScreenConfig>(currentConfig || DEFAULT_CONFIG);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setConfig({ ...DEFAULT_CONFIG, ...(currentConfig || {}) });
        }
    }, [show, currentConfig]);

    const handleChange = (field: keyof WelcomeScreenConfig, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(config);
            onClose();
        } catch (error) {
            console.error("Failed to save welcome config:", error);
            alert("Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa màn hình đăng nhập</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-700 border-b pb-2 flex items-center gap-2">
                            <span>🏷️</span> Tiêu đề & Nút bấm
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Nội dung tiêu đề (Dùng \n để ngắt dòng)</label>
                                <textarea 
                                    value={config.titleText} 
                                    onChange={e => handleChange('titleText', e.target.value.toUpperCase())}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold uppercase min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Văn bản nút Bắt đầu (START)</label>
                                    <input type="text" value={config.startButtonText} onChange={e => handleChange('startButtonText', e.target.value)} className="w-full p-2 border rounded font-black text-center text-red-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Màu sắc tiêu đề</label>
                                    <input type="color" value={config.titleColor} onChange={e => handleChange('titleColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-teal-700 border-b pb-2 flex items-center gap-2">
                            <span>👤</span> Khung nhập Họ tên
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Độ rộng khung: <span className="text-teal-600">{config.inputNameWidth}%</span></label>
                                    <input type="range" min="50" max="100" step="1" value={config.inputNameWidth} onChange={e => handleChange('inputNameWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ nhập: <span className="text-teal-600">{config.inputNameFontSize}rem</span></label>
                                    <input type="range" min="0.8" max="3" step="0.05" value={config.inputNameFontSize} onChange={e => handleChange('inputNameFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gợi ý (Placeholder)</label>
                                    <input type="text" value={config.inputNamePlaceholder} onChange={e => handleChange('inputNamePlaceholder', e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-orange-700 border-b pb-2 flex items-center gap-2">
                            <span>🏫</span> Khung nhập Lớp
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Độ rộng khung (rem): <span className="text-orange-600">{config.inputClassWidth}rem</span></label>
                                    <input type="range" min="4" max="20" step="0.5" value={config.inputClassWidth} onChange={e => handleChange('inputClassWidth', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gợi ý (Placeholder)</label>
                                    <input type="text" value={config.inputClassPlaceholder} onChange={e => handleChange('inputClassPlaceholder', e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition" disabled={isSaving}>Hủy bỏ</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-lg disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWelcomeScreenModal;
