
import React, { useState, useEffect } from 'react';
import { ExerciseSelectionConfig } from '../types';

interface EditExerciseSelectionModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: ExerciseSelectionConfig) => Promise<void>;
    currentConfig: ExerciseSelectionConfig | null;
}

const DEFAULT_UNIT_COLORS = [
    '#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828',
    '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'
];

const DEFAULT_CONFIG: ExerciseSelectionConfig = {
    mainTitle: 'TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ',
    mainTitleFontSize: 1.875,
    mainTitleColor: '#dc2626',
    subtitle: '(Chọn một mục bên dưới để bắt đầu luyện tập)',
    subtitleFontSize: 1.125,
    subtitleColor: '#4b5563',
    backButtonText: 'Quay lại',
    
    card1Title: 'English 12',
    card1Icon: '📝',
    card1Color: '#3b82f6',
    card2Title: 'Topic-based vocabulary',
    card2Icon: '📰',
    card2Color: '#a855f7',
    cardFontSize: 1.5,
    cardHeight: 10,
    cardBorderRadius: 16,

    unitLabelText: 'UNIT',
    unitCardColors: DEFAULT_UNIT_COLORS,
    unitCardTextColor: '#ffffff',
    unitCardLabelColor: '#fde047',
    unitCardFontSize: 2.25,
    unitCardHeight: 7,
    unitCardWidth: 100,
    unitCardBorderRadius: 8,
    unitItemsPerRow: 5,

    topicLabelText: 'TOPIC',
    topicCardColors: DEFAULT_UNIT_COLORS,
    topicCardTextColor: '#ffffff',
    topicCardLabelColor: '#fde047',
    topicCardFontSize: 1.8,
    topicCardHeight: 6,
    topicCardWidth: 100,
    topicCardBorderRadius: 12,
    topicItemsPerRow: 6,

    exitButtonText: 'Thoát',
    dividerColor1: '#ffffff',
    dividerColor2: '#facc15',

    activityLearnLabel: 'Học từ vựng',
    activityLearnDesc: 'Xem lại danh sách từ của bài',
    activityMatchLabel: 'Trò chơi Ghép cặp',
    activityMatchDesc: 'Nối từ tiếng Anh với nghĩa Việt',
    activitySpellLabel: 'Trò chơi Viết Chính tả',
    activitySpellDesc: 'Viết từ tiếng Anh tương ứng',
    activityQuizLabel: 'Làm bài trắc nghiệm',
    activityQuizDesc: 'Kiểm tra kiến thức của bạn',
};

const EditExerciseSelectionModal: React.FC<EditExerciseSelectionModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<ExerciseSelectionConfig>(currentConfig || DEFAULT_CONFIG);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'titles' | 'cards' | 'units' | 'activities'>('titles');

    useEffect(() => {
        if (show) {
            setConfig({ 
                ...DEFAULT_CONFIG, 
                ...(currentConfig || {}),
                unitCardColors: currentConfig?.unitCardColors || DEFAULT_UNIT_COLORS,
                topicCardColors: currentConfig?.topicCardColors || DEFAULT_UNIT_COLORS
            });
        }
    }, [show, currentConfig]);

    const handleChange = (field: keyof ExerciseSelectionConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleColorChange = (type: 'unit' | 'topic', index: number, color: string) => {
        const field = type === 'unit' ? 'unitCardColors' : 'topicCardColors';
        const newColors = [...(config[field] || DEFAULT_UNIT_COLORS)];
        newColors[index] = color;
        handleChange(field, newColors);
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Thiết kế màn hình học tập HS</h2>
                        <p className="text-sm text-gray-500 italic mt-1">Tùy chỉnh giao diện Unit và Topic riêng biệt</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex border-b bg-gray-50 overflow-x-auto">
                    {[
                        { id: 'titles', label: 'Tiêu đề & Nút', icon: '📝' },
                        { id: 'cards', label: 'Thẻ chính', icon: '🎨' },
                        { id: 'units', label: 'Ô Số Unit/Topic', icon: '🔲' },
                        { id: 'activities', label: 'Các phần thi', icon: '🏆' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`min-w-[120px] flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto p-8 space-y-8 bg-white">
                    {activeTab === 'titles' && (
                        <div className="space-y-6 tab-content-enter">
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2"><span>🏷️</span> Văn bản tiêu đề chính</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Nội dung Tiêu đề chính</label>
                                        <input type="text" value={config.mainTitle} onChange={e => handleChange('mainTitle', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                        <input type="color" value={config.mainTitleColor} onChange={e => handleChange('mainTitleColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ: <span className="text-red-600 font-bold">{config.mainTitleFontSize}rem</span></label>
                                        <input type="range" min="1" max="5" step="0.1" value={config.mainTitleFontSize} onChange={e => handleChange('mainTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><span>📝</span> Tiêu đề phụ & Nút bấm</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Văn bản Tiêu đề phụ</label>
                                        <input type="text" value={config.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Văn bản nút "Quay lại"</label>
                                        <input type="text" value={config.backButtonText} onChange={e => handleChange('backButtonText', e.target.value)} className="w-full p-2 border rounded font-bold text-blue-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Màu chữ Tiêu đề phụ</label>
                                        <input type="color" value={config.subtitleColor} onChange={e => handleChange('subtitleColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cards' && (
                        <div className="space-y-6 tab-content-enter">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 border rounded-xl bg-blue-50/50">
                                    <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><span>1️⃣</span> Thẻ English 12</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên hiển thị</label>
                                            <input type="text" value={config.card1Title} onChange={e => handleChange('card1Title', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Màu nền thẻ</label>
                                            <input type="color" value={config.card1Color} onChange={e => handleChange('card1Color', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border rounded-xl bg-purple-50/50">
                                    <h4 className="font-bold text-purple-800 mb-4 flex items-center gap-2"><span>2️⃣</span> Thẻ Vocabulary by Topic</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên hiển thị</label>
                                            <input type="text" value={config.card2Title} onChange={e => handleChange('card2Title', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Màu nền thẻ</label>
                                            <input type="color" value={config.card2Color} onChange={e => handleChange('card2Color', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border rounded-xl bg-gray-50">
                                <h4 className="font-bold text-gray-800 mb-4">Kích thước & Kiểu dáng thẻ (Chung)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Cỡ chữ Thẻ chính: <span className="text-blue-600 font-bold">{config.cardFontSize}rem</span></label>
                                        <input type="range" min="1" max="3" step="0.1" value={config.cardFontSize} onChange={e => handleChange('cardFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Chiều cao Thẻ: <span className="text-blue-600 font-bold">{config.cardHeight}rem</span></label>
                                        <input type="range" min="5" max="25" step="1" value={config.cardHeight} onChange={e => handleChange('cardHeight', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Độ bo góc: <span className="text-blue-600 font-bold">{config.cardBorderRadius}px</span></label>
                                        <input type="range" min="0" max="60" step="2" value={config.cardBorderRadius} onChange={e => handleChange('cardBorderRadius', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'units' && (
                        <div className="space-y-12 tab-content-enter">
                            {/* Section: UNIT DESIGN */}
                            <div className="p-6 border rounded-2xl bg-teal-50 border-teal-200">
                                <h3 className="font-black text-teal-900 mb-6 flex items-center gap-2 text-xl border-b border-teal-200 pb-2">
                                    <span>📗</span> 1. THIẾT KẾ Ô UNIT (LỚP 12)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nhãn văn bản</label>
                                        <input type="text" value={config.unitLabelText} onChange={e => handleChange('unitLabelText', e.target.value)} className="w-full p-2 border rounded font-bold text-teal-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Số ô mỗi hàng: <span className="text-teal-600">{config.unitItemsPerRow} ô</span></label>
                                        <input type="range" min="1" max="10" step="1" value={config.unitItemsPerRow} onChange={e => handleChange('unitItemsPerRow', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Màu nhãn loại ô</label>
                                        <input type="color" value={config.unitCardLabelColor} onChange={e => handleChange('unitCardLabelColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Màu chữ số</label>
                                        <input type="color" value={config.unitCardTextColor} onChange={e => handleChange('unitCardTextColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Độ rộng ô: <span className="text-teal-600">{config.unitCardWidth}%</span></label>
                                        <input type="range" min="20" max="100" step="1" value={config.unitCardWidth} onChange={e => handleChange('unitCardWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Chiều cao ô: <span className="text-teal-600">{config.unitCardHeight}rem</span></label>
                                        <input type="range" min="4" max="15" step="0.5" value={config.unitCardHeight} onChange={e => handleChange('unitCardHeight', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Cỡ chữ số: <span className="text-teal-600">{config.unitCardFontSize}rem</span></label>
                                        <input type="range" min="1" max="6" step="0.1" value={config.unitCardFontSize} onChange={e => handleChange('unitCardFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Độ bo góc: <span className="text-teal-600">{config.unitCardBorderRadius}px</span></label>
                                        <input type="range" min="0" max="40" step="2" value={config.unitCardBorderRadius} onChange={e => handleChange('unitCardBorderRadius', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-teal-100 pt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 text-sm">Bảng màu 10 ô Unit:</h4>
                                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                        {(config.unitCardColors || DEFAULT_UNIT_COLORS).map((color, idx) => (
                                            <input key={idx} type="color" value={color} onChange={e => handleColorChange('unit', idx, e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section: TOPIC DESIGN */}
                            <div className="p-6 border rounded-2xl bg-purple-50 border-purple-200">
                                <h3 className="font-black text-purple-900 mb-6 flex items-center gap-2 text-xl border-b border-purple-200 pb-2">
                                    <span>📘</span> 2. THIẾT KẾ Ô TOPIC (CHỦ ĐỀ)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nhãn văn bản</label>
                                        <input type="text" value={config.topicLabelText} onChange={e => handleChange('topicLabelText', e.target.value)} className="w-full p-2 border rounded font-bold text-purple-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Số ô mỗi hàng: <span className="text-purple-600">{config.topicItemsPerRow} ô</span></label>
                                        <input type="range" min="1" max="12" step="1" value={config.topicItemsPerRow} onChange={e => handleChange('topicItemsPerRow', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Màu nhãn loại ô</label>
                                        <input type="color" value={config.topicCardLabelColor} onChange={e => handleChange('topicCardLabelColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Màu chữ số</label>
                                        <input type="color" value={config.topicCardTextColor} onChange={e => handleChange('topicCardTextColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Độ rộng ô: <span className="text-purple-600">{config.topicCardWidth}%</span></label>
                                        <input type="range" min="20" max="100" step="1" value={config.topicCardWidth} onChange={e => handleChange('topicCardWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Chiều cao ô: <span className="text-purple-600">{config.topicCardHeight}rem</span></label>
                                        <input type="range" min="4" max="15" step="0.5" value={config.topicCardHeight} onChange={e => handleChange('topicCardHeight', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Cỡ chữ số: <span className="text-purple-600">{config.topicCardFontSize}rem</span></label>
                                        <input type="range" min="1" max="6" step="0.1" value={config.topicCardFontSize} onChange={e => handleChange('topicCardFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Độ bo góc: <span className="text-purple-600">{config.topicCardBorderRadius}px</span></label>
                                        <input type="range" min="0" max="40" step="2" value={config.topicCardBorderRadius} onChange={e => handleChange('topicCardBorderRadius', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-purple-100 pt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 text-sm">Chu kỳ bảng màu ô Topic:</h4>
                                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                        {(config.topicCardColors || DEFAULT_UNIT_COLORS).map((color, idx) => (
                                            <input key={idx} type="color" value={color} onChange={e => handleColorChange('topic', idx, e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section: GLOBAL SETTINGS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-xl bg-gray-50">
                                <div className="md:col-span-3 font-bold text-gray-800 border-b pb-1">CÀI ĐẶT CHUNG</div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Văn bản nút "Thoát"</label>
                                    <input type="text" value={config.exitButtonText} onChange={e => handleChange('exitButtonText', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Màu dòng kẻ 1</label>
                                    <input type="color" value={config.dividerColor1} onChange={e => handleChange('dividerColor1', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Màu dòng kẻ 2</label>
                                    <input type="color" value={config.dividerColor2} onChange={e => handleChange('dividerColor2', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activities' && (
                        <div className="space-y-6 tab-content-enter">
                            <div className="p-6 border rounded-2xl bg-orange-50 border-orange-100">
                                <h3 className="font-bold text-orange-800 mb-6 flex items-center gap-2"><span>🏆</span> Văn bản các hoạt động phần thi</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Học từ vựng */}
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-blue-600 uppercase">Mục 1: Tên & Mô tả</label>
                                        <input type="text" value={config.activityLearnLabel} onChange={e => handleChange('activityLearnLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityLearnDesc} onChange={e => handleChange('activityLearnDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} placeholder="Dòng mô tả nhỏ bên dưới..." />
                                    </div>
                                    {/* Ghép cặp */}
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-purple-600 uppercase">Mục 2: Tên & Mô tả</label>
                                        <input type="text" value={config.activityMatchLabel} onChange={e => handleChange('activityMatchLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityMatchDesc} onChange={e => handleChange('activityMatchDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                    {/* Chính tả */}
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-orange-600 uppercase">Mục 3: Tên & Mô tả</label>
                                        <input type="text" value={config.activitySpellLabel} onChange={e => handleChange('activitySpellLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activitySpellDesc} onChange={e => handleChange('activitySpellDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                    {/* Trắc nghiệm */}
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-green-600 uppercase">Mục 4: Tên & Mô tả</label>
                                        <input type="text" value={config.activityQuizLabel} onChange={e => handleChange('activityQuizLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityQuizDesc} onChange={e => handleChange('activityQuizDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-4 rounded-b-2xl">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition" disabled={isSaving}>Hủy bỏ</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:bg-blue-400">
                        {isSaving ? 'Đang lưu...' : 'Lưu tất cả thiết kế'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditExerciseSelectionModal;
