
import React, { useState, useEffect } from 'react';
import { DashboardConfig } from '../types';

interface EditDashboardConfigModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: DashboardConfig) => Promise<void>;
    currentConfig: DashboardConfig | null;
}

const DEFAULT_CONFIG: DashboardConfig = {
    unitsTabLabel: 'Quản lý UNITs _ English 12',
    topicsTabLabel: 'Quản lý TOPICs',
    tabFontSize: 1,
    tabPadding: 0.75,
    sectionTitleFontSize: 1.875,
    sectionTitleColor: '#ffffff',
    cardUnitLabel: 'UNIT',
    cardTopicLabel: 'TOPIC',
    cardLabelFontSize: 1.5,
    cardLabelColor: '#fde047',
    cardValueFontSize: 6,
    manageButtonText: 'Quản lý Nội dung',
    manageButtonFontSize: 1,
    manageButtonColor: '#dc2626',
};

const EditDashboardConfigModal: React.FC<EditDashboardConfigModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<DashboardConfig>(currentConfig || DEFAULT_CONFIG);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setConfig(currentConfig || DEFAULT_CONFIG);
        }
    }, [show, currentConfig]);

    const handleChange = (field: keyof DashboardConfig, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(config);
            onClose();
        } catch (error) {
            console.error("Failed to save dashboard config:", error);
            alert("Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa nội dung màn hình quản lý</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    {/* Tabs Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-indigo-700 border-b pb-2">Tabs Chức năng</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Tên Tab UNITs</label>
                                <input type="text" value={config.unitsTabLabel} onChange={e => handleChange('unitsTabLabel', e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ Tab: <span className="text-indigo-600">{config.tabFontSize}rem</span></label>
                                <input type="range" min="0.5" max="2.5" step="0.1" value={config.tabFontSize} onChange={e => handleChange('tabFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Đệm lề Tab: <span className="text-indigo-600">{config.tabPadding}rem</span></label>
                                <input type="range" min="0.2" max="3" step="0.1" value={config.tabPadding} onChange={e => handleChange('tabPadding', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                        </div>
                    </div>

                    {/* Titles Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-700 border-b pb-2">Tiêu đề Section</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                <input type="color" value={config.sectionTitleColor} onChange={e => handleChange('sectionTitleColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ Tiêu đề: <span className="text-blue-600">{config.sectionTitleFontSize}rem</span></label>
                                <input type="range" min="1" max="4" step="0.1" value={config.sectionTitleFontSize} onChange={e => handleChange('sectionTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Cards Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-yellow-600 border-b pb-2">Khung hiển thị (Cards)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Nhãn khung: <span className="text-yellow-600">{config.cardLabelFontSize}rem</span></label>
                                <input type="range" min="0.8" max="3" step="0.1" value={config.cardLabelFontSize} onChange={e => handleChange('cardLabelFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ Số thứ tự: <span className="text-yellow-600">{config.cardValueFontSize}rem</span></label>
                                <input type="range" min="2" max="10" step="0.5" value={config.cardValueFontSize} onChange={e => handleChange('cardValueFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600" />
                            </div>
                        </div>
                    </div>

                    {/* Buttons Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-red-600 border-b pb-2">Nút Quản lý</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Màu nút</label>
                                <input type="color" value={config.manageButtonColor} onChange={e => handleChange('manageButtonColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ nút: <span className="text-red-600">{config.manageButtonFontSize}rem</span></label>
                                <input type="range" min="0.7" max="2" step="0.05" value={config.manageButtonFontSize} onChange={e => handleChange('manageButtonFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition" disabled={isSaving}>Hủy bỏ</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditDashboardConfigModal;
