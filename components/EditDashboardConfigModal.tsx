
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
            setConfig({ ...DEFAULT_CONFIG, ...(currentConfig || {}) });
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

    const RangeInput = ({ label, value, unit, min, max, step, onChange }: any) => (
        <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
                {label}: <span className="text-indigo-600 font-bold">{value}{unit}</span>
            </label>
            <input 
                type="range" 
                min={min} max={max} step={step} 
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
            />
        </div>
    );

    const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
        <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-600 mb-1">{label}</label>
            <div className="relative h-10 w-full rounded border border-gray-300 overflow-hidden shadow-sm">
                <input 
                    type="color" 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-100 p-0 border-0"
                    style={{ backgroundColor: value }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-difference text-white text-xs font-bold uppercase">
                    {value}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Thiết kế giao diện GV</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    {/* Tabs Section */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-indigo-700 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>📑</span> Các Tabs chức năng
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Tên Tab UNITs</label>
                                <input type="text" value={config.unitsTabLabel} onChange={e => handleChange('unitsTabLabel', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Tên Tab TOPICs</label>
                                <input type="text" value={config.topicsTabLabel} onChange={e => handleChange('topicsTabLabel', e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 outline-none" />
                            </div>
                            <RangeInput label="Cỡ chữ Tab" value={config.tabFontSize} unit="rem" min={0.5} max={2.5} step={0.1} onChange={(v: number) => handleChange('tabFontSize', v)} />
                            <RangeInput label="Đệm lề Tab (Padding)" value={config.tabPadding} unit="rem" min={0.2} max={3} step={0.1} onChange={(v: number) => handleChange('tabPadding', v)} />
                        </div>
                    </div>

                    {/* Titles Section */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-blue-700 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>🏷️</span> Tiêu đề các mục (Section Titles)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ColorInput label="Màu chữ Tiêu đề" value={config.sectionTitleColor} onChange={(v: string) => handleChange('sectionTitleColor', v)} />
                            <RangeInput label="Cỡ chữ Tiêu đề" value={config.sectionTitleFontSize} unit="rem" min={1} max={4} step={0.1} onChange={(v: number) => handleChange('sectionTitleFontSize', v)} />
                        </div>
                    </div>

                    {/* Cards Section */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-amber-600 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>🔲</span> Thiết kế ô vuông (Cards)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Nhãn UNIT</label>
                                <input type="text" value={config.cardUnitLabel} onChange={e => handleChange('cardUnitLabel', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Nhãn TOPIC</label>
                                <input type="text" value={config.cardTopicLabel} onChange={e => handleChange('cardTopicLabel', e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none" />
                            </div>
                            <ColorInput label="Màu sắc Nhãn" value={config.cardLabelColor} onChange={(v: string) => handleChange('cardLabelColor', v)} />
                            
                            <RangeInput label="Cỡ chữ Nhãn" value={config.cardLabelFontSize} unit="rem" min={0.8} max={3} step={0.1} onChange={(v: number) => handleChange('cardLabelFontSize', v)} />
                            <div className="md:col-span-2">
                                <RangeInput label="Cỡ chữ Số thứ tự" value={config.cardValueFontSize} unit="rem" min={2} max={10} step={0.5} onChange={(v: number) => handleChange('cardValueFontSize', v)} />
                            </div>
                        </div>
                    </div>

                    {/* Buttons Section */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-red-600 border-b pb-2 mb-4 flex items-center gap-2">
                            <span>🔘</span> Nút Quản lý Nội dung
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Văn bản hiển thị trên nút</label>
                                <input 
                                    type="text" 
                                    value={config.manageButtonText} 
                                    onChange={e => handleChange('manageButtonText', e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-200 outline-none font-bold text-red-700" 
                                />
                            </div>
                            <ColorInput label="Màu nền nút" value={config.manageButtonColor} onChange={(v: string) => handleChange('manageButtonColor', v)} />
                            <RangeInput label="Cỡ chữ nút" value={config.manageButtonFontSize} unit="rem" min={0.7} max={2} step={0.05} onChange={(v: number) => handleChange('manageButtonFontSize', v)} />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-4 rounded-b-2xl">
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
