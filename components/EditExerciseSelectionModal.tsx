
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

    quizDuration: 30,
    quizTimerEnabled: true,
    spellingDuration: 30,
    spellingTimerEnabled: true,
    matchingDuration: 20,
    matchingTimerEnabled: true,

    actModalBgColor: '#ffffff',
    actModalTitleColor: '#1e293b',
    actModalTitleFontSize: 1.875,
    actStudentBadgeBgColor: '#fef3c7',
    actStudentBadgeTextColor: '#78350f',
    actStudentBadgeFontSize: 0.75,

    actLearnBgColor: '#2563eb',
    actLearnTitleColor: '#ffffff',
    actLearnTitleFontSize: 1.125,

    actMatchBgColor: '#0d9488',
    actMatchTitleColor: '#ffffff',
    actMatchTitleFontSize: 1.125,

    actSpellBgColor: '#0284c7',
    actSpellTitleColor: '#ffffff',
    actSpellTitleFontSize: 1.125,

    actQuizBgColor: '#0f172a',
    actQuizTitleColor: '#ffffff',
    actQuizTitleFontSize: 1.125,

    actOpenCountBgColor: '#0f172a',
    actOpenCountLabelColor: '#ffffff',
    actOpenCountLabelFontSize: 0.65,
    actOpenCountValueColor: '#fef08a',
    actOpenCountValueFontSize: 0.875,

    actTimeHeaderColor: '#ffffff',
    actTimeHeaderFontSize: 0.7,
    actAttemptBoxBgColor: '#0f172a',
    actAttemptTextColor: '#ffffff',
    actAttemptFontSize: 0.75,
    actTotalTimeBoxBgColor: '#1e293b',
    actTotalTimeLabelColor: '#ffffff',
    actTotalTimeLabelFontSize: 0.75,
    actTotalTimeValueColor: '#fef08a',
    actTotalTimeValueFontSize: 0.875,
};

const EditExerciseSelectionModal: React.FC<EditExerciseSelectionModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<ExerciseSelectionConfig>(currentConfig || DEFAULT_CONFIG);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'titles' | 'cards' | 'units' | 'activities' | 'actDesign'>('titles');

    useEffect(() => {
        if (show && currentConfig) {
            setConfig({ 
                ...DEFAULT_CONFIG, 
                ...currentConfig,
                unitCardColors: currentConfig.unitCardColors || DEFAULT_UNIT_COLORS,
                topicCardColors: currentConfig.topicCardColors || DEFAULT_UNIT_COLORS
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

    const ToggleSwitch = ({ enabled, onToggle, label }: { enabled: boolean, onToggle: (v: boolean) => void, label: string }) => (
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
            <button 
                onClick={() => onToggle(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[120] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Thiết kế màn hình học tập HS</h2>
                        <p className="text-sm text-gray-500 italic mt-1">Tùy chỉnh giao diện và giới hạn thời gian</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex border-b bg-gray-50 overflow-x-auto">
                    {[
                        { id: 'titles', label: 'Tiêu đề & Nút', icon: '📝' },
                        { id: 'cards', label: 'Thẻ chính', icon: '🎨' },
                        { id: 'units', label: 'Ô Số Unit/Topic', icon: '🔲' },
                        { id: 'activities', label: 'Các phần thi', icon: '🏆' },
                        { id: 'actDesign', label: 'Giao diện Bài tập', icon: '📱' }
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
                                        <input type="range" min="20" max="200" step="1" value={config.unitCardWidth} onChange={e => handleChange('unitCardWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
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
                                        <input type="range" min="20" max="200" step="1" value={config.topicCardWidth} onChange={e => handleChange('topicCardWidth', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
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
                                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-xl">
                                    <span>🏆</span> Thiết lập Thời gian & Tên bài thi
                                </h3>
                                <p className="text-sm text-orange-700 mb-6 bg-orange-100/50 p-2 rounded border border-orange-200 italic">
                                    * Sử dụng nút gạt để bật/tắt giới hạn thời gian. Khi tắt, học sinh có thể làm bài vô hạn thời gian.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white p-6 rounded-xl border border-orange-200">
                                    {/* Quiz Timer */}
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200 shadow-sm transition-all">
                                        <ToggleSwitch 
                                            enabled={config.quizTimerEnabled} 
                                            onToggle={(v) => handleChange('quizTimerEnabled', v)} 
                                            label="⏱️ Đồng hồ Trắc nghiệm" 
                                        />
                                        <div className={`mt-2 transition-all duration-300 ${config.quizTimerEnabled ? 'opacity-100' : 'opacity-30'}`}>
                                            <label className="block text-[10px] font-black text-green-700 uppercase mb-1">Số phút làm bài</label>
                                            <input 
                                                type="number" min="1" max="180" 
                                                value={config.quizDuration} 
                                                onChange={e => handleChange('quizDuration', parseInt(e.target.value) || 30)} 
                                                className="w-full p-2 border border-green-200 rounded font-black text-green-800 focus:ring-2 focus:ring-green-300 outline-none" 
                                                disabled={!config.quizTimerEnabled}
                                            />
                                        </div>
                                    </div>

                                    {/* Spelling Timer */}
                                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 shadow-sm transition-all">
                                        <ToggleSwitch 
                                            enabled={config.spellingTimerEnabled} 
                                            onToggle={(v) => handleChange('spellingTimerEnabled', v)} 
                                            label="⏱️ Đồng hồ Chính tả" 
                                        />
                                        <div className={`mt-2 transition-all duration-300 ${config.spellingTimerEnabled ? 'opacity-100' : 'opacity-30'}`}>
                                            <label className="block text-[10px] font-black text-orange-700 uppercase mb-1">Số phút làm bài</label>
                                            <input 
                                                type="number" min="1" max="180" 
                                                value={config.spellingDuration} 
                                                onChange={e => handleChange('spellingDuration', parseInt(e.target.value) || 30)} 
                                                className="w-full p-2 border border-orange-200 rounded font-black text-orange-800 focus:ring-2 focus:ring-orange-300 outline-none" 
                                                disabled={!config.spellingTimerEnabled}
                                            />
                                        </div>
                                    </div>

                                    {/* Matching Timer */}
                                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 shadow-sm transition-all">
                                        <ToggleSwitch 
                                            enabled={config.matchingTimerEnabled} 
                                            onToggle={(v) => handleChange('matchingTimerEnabled', v)} 
                                            label="⏱️ Đồng hồ Ghép cặp" 
                                        />
                                        <div className={`mt-2 transition-all duration-300 ${config.matchingTimerEnabled ? 'opacity-100' : 'opacity-30'}`}>
                                            <label className="block text-[10px] font-black text-purple-700 uppercase mb-1">Số phút làm bài</label>
                                            <input 
                                                type="number" min="1" max="180" 
                                                value={config.matchingDuration} 
                                                onChange={e => handleChange('matchingDuration', parseInt(e.target.value) || 20)} 
                                                className="w-full p-2 border border-purple-200 rounded font-black text-purple-800 focus:ring-2 focus:ring-purple-300 outline-none" 
                                                disabled={!config.matchingTimerEnabled}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Labels configuration */}
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-blue-600 uppercase">Phần 1: Học từ vựng</label>
                                        <input type="text" value={config.activityLearnLabel} onChange={e => handleChange('activityLearnLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityLearnDesc} onChange={e => handleChange('activityLearnDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} placeholder="Dòng mô tả nhỏ bên dưới..." />
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-purple-600 uppercase">Phần 2: Ghép cặp</label>
                                        <input type="text" value={config.activityMatchLabel} onChange={e => handleChange('activityMatchLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityMatchDesc} onChange={e => handleChange('activityMatchDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-orange-600 uppercase">Phần 3: Chính tả</label>
                                        <input type="text" value={config.activitySpellLabel} onChange={e => handleChange('activitySpellLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activitySpellDesc} onChange={e => handleChange('activitySpellDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm space-y-3">
                                        <label className="block text-xs font-bold text-green-600 uppercase">Phần 4: Trắc nghiệm</label>
                                        <input type="text" value={config.activityQuizLabel} onChange={e => handleChange('activityQuizLabel', e.target.value)} className="w-full p-2 border rounded font-bold" />
                                        <textarea value={config.activityQuizDesc} onChange={e => handleChange('activityQuizDesc', e.target.value)} className="w-full p-2 border rounded text-xs text-gray-600" rows={2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'actDesign' && (
                        <div className="space-y-8 tab-content-enter">
                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <h3 className="font-extrabold text-indigo-900 text-lg mb-1">📱 Cài đặt Màn hình Bài tập & Thi của Học sinh</h3>
                                <p className="text-sm text-indigo-700 italic">Tùy chỉnh chi tiết màu nền, màu chữ và kích thước chữ cho tất cả các thành phần trong màn hình học sinh.</p>
                            </div>

                            {/* 1. Modal Container & Header */}
                            <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
                                <h4 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2"><span>1️⃣</span> Thông tin Giáo viên / Tiêu đề Màn hình Học sinh</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 mb-1">Dòng 1 (VD: "GV: Trương Thanh Tùy")</label>
                                        <input 
                                            type="text" 
                                            value={config.actHeaderLine1 !== undefined ? config.actHeaderLine1 : 'GV: Trương Thanh Tùy'} 
                                            onChange={e => handleChange('actHeaderLine1', e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="GV: Trương Thanh Tùy"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-800 mb-1">Dòng 2 (VD: "Tổ trưởng tổ Tiếng Anh_ Trường THPT Nguyễn Trường Tộ")</label>
                                        <input 
                                            type="text" 
                                            value={config.actHeaderLine2 !== undefined ? config.actHeaderLine2 : 'Tổ trưởng tổ Tiếng Anh_ Trường THPT Nguyễn Trường Tộ'} 
                                            onChange={e => handleChange('actHeaderLine2', e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500" 
                                            placeholder="Tổ trưởng tổ Tiếng Anh_..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu sắc chữ Tiêu đề / GV</label>
                                        <input 
                                            type="color" 
                                            value={config.actHeaderColor || config.actModalTitleColor || '#ffffff'} 
                                            onChange={e => {
                                                handleChange('actHeaderColor', e.target.value);
                                                handleChange('actModalTitleColor', e.target.value);
                                            }} 
                                            className="w-full h-10 p-0 border-0 cursor-pointer rounded" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Tiêu đề / GV: <span className="text-blue-600 font-bold">{config.actHeaderFontSize || config.actModalTitleFontSize || 1.5}rem</span></label>
                                        <input 
                                            type="range" 
                                            min="0.8" 
                                            max="3" 
                                            step="0.05" 
                                            value={config.actHeaderFontSize || config.actModalTitleFontSize || 1.5} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                handleChange('actHeaderFontSize', val);
                                                handleChange('actModalTitleFontSize', val);
                                            }} 
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Font chữ (Phông chữ)</label>
                                        <select 
                                            value={config.actHeaderFontFamily || 'sans-serif'} 
                                            onChange={e => handleChange('actHeaderFontFamily', e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-xs font-semibold bg-white cursor-pointer"
                                        >
                                            <option value="sans-serif">Mặc định (Sans-Serif / Phổ thông)</option>
                                            <option value="'Nunito', sans-serif">Nunito (Bo tròn / Thân thiện)</option>
                                            <option value="'Montserrat', sans-serif">Montserrat (Hiện đại / Đậm)</option>
                                            <option value="'Playfair Display', serif">Playfair Display (Nghệ thuật / Chân cổ điển)</option>
                                            <option value="serif">Serif (Có chân tiêu chuẩn)</option>
                                            <option value="'Courier New', monospace">Courier New (Đơn khoảng)</option>
                                            <option value="'Dancing Script', cursive">Dancing Script (Chữ viết tay)</option>
                                            <option value="'Arial', sans-serif">Arial</option>
                                            <option value="'Times New Roman', serif">Times New Roman</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Khung Bài tập Modal</label>
                                        <input type="color" value={config.actModalBgColor || '#ffffff'} onChange={e => handleChange('actModalBgColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Huy hiệu HS ("Tuy - Lớp 12A")</label>
                                        <input type="color" value={config.actStudentBadgeBgColor || '#fef3c7'} onChange={e => handleChange('actStudentBadgeBgColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Huy hiệu HS</label>
                                        <input type="color" value={config.actStudentBadgeTextColor || '#78350f'} onChange={e => handleChange('actStudentBadgeTextColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Huy hiệu HS: <span className="text-blue-600 font-bold">{config.actStudentBadgeFontSize || 0.75}rem</span></label>
                                        <input type="range" min="0.5" max="2" step="0.05" value={config.actStudentBadgeFontSize || 0.75} onChange={e => handleChange('actStudentBadgeFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Individual Cards Design */}
                            <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-6">
                                <h4 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2"><span>2️⃣</span> Màu nền & Cỡ chữ Tiêu đề các Thẻ Bài tập</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Learn Card */}
                                    <div className="p-4 rounded-xl border bg-blue-50/60 space-y-3">
                                        <span className="font-bold text-blue-900 text-sm block">Thẻ 1: Học Từ Vựng</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu nền Thẻ</label>
                                                <input type="color" value={config.actLearnBgColor || '#2563eb'} onChange={e => handleChange('actLearnBgColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                                <input type="color" value={config.actLearnTitleColor || '#ffffff'} onChange={e => handleChange('actLearnTitleColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Cỡ chữ: {config.actLearnTitleFontSize || 1.125}rem</label>
                                                <input type="range" min="0.8" max="2.5" step="0.05" value={config.actLearnTitleFontSize || 1.125} onChange={e => handleChange('actLearnTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Match Card */}
                                    <div className="p-4 rounded-xl border bg-teal-50/60 space-y-3">
                                        <span className="font-bold text-teal-900 text-sm block">Thẻ 2: Trò Chơi Ghép Cặp</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu nền Thẻ</label>
                                                <input type="color" value={config.actMatchBgColor || '#0d9488'} onChange={e => handleChange('actMatchBgColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                                <input type="color" value={config.actMatchTitleColor || '#ffffff'} onChange={e => handleChange('actMatchTitleColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Cỡ chữ: {config.actMatchTitleFontSize || 1.125}rem</label>
                                                <input type="range" min="0.8" max="2.5" step="0.05" value={config.actMatchTitleFontSize || 1.125} onChange={e => handleChange('actMatchTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Spell Card */}
                                    <div className="p-4 rounded-xl border bg-sky-50/60 space-y-3">
                                        <span className="font-bold text-sky-900 text-sm block">Thẻ 3: Trò Chơi Viết Chính Tả</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu nền Thẻ</label>
                                                <input type="color" value={config.actSpellBgColor || '#0284c7'} onChange={e => handleChange('actSpellBgColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                                <input type="color" value={config.actSpellTitleColor || '#ffffff'} onChange={e => handleChange('actSpellTitleColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Cỡ chữ: {config.actSpellTitleFontSize || 1.125}rem</label>
                                                <input type="range" min="0.8" max="2.5" step="0.05" value={config.actSpellTitleFontSize || 1.125} onChange={e => handleChange('actSpellTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quiz Card */}
                                    <div className="p-4 rounded-xl border bg-slate-100 space-y-3">
                                        <span className="font-bold text-slate-900 text-sm block">Thẻ 4: Kiểm Tra Từ Mới Học</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu nền Thẻ</label>
                                                <input type="color" value={config.actQuizBgColor || '#0f172a'} onChange={e => handleChange('actQuizBgColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu chữ Tiêu đề</label>
                                                <input type="color" value={config.actQuizTitleColor || '#ffffff'} onChange={e => handleChange('actQuizTitleColor', e.target.value)} className="w-full h-9 p-0 border-0 cursor-pointer rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Cỡ chữ: {config.actQuizTitleFontSize || 1.125}rem</label>
                                                <input type="range" min="0.8" max="2.5" step="0.05" value={config.actQuizTitleFontSize || 1.125} onChange={e => handleChange('actQuizTitleFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Open Count Box Styling */}
                            <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
                                <h4 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2"><span>3️⃣</span> Khung "SỐ LẦN MỞ HỌC"</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Khung</label>
                                        <input type="color" value={config.actOpenCountBgColor && config.actOpenCountBgColor.startsWith('#') ? config.actOpenCountBgColor : '#0f172a'} onChange={e => handleChange('actOpenCountBgColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Nhãn ("SỐ LẦN MỞ HỌC")</label>
                                        <input type="color" value={config.actOpenCountLabelColor || '#ffffff'} onChange={e => handleChange('actOpenCountLabelColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Nhãn: <span className="text-blue-600 font-bold">{config.actOpenCountLabelFontSize || 0.65}rem</span></label>
                                        <input type="range" min="0.4" max="1.5" step="0.05" value={config.actOpenCountLabelFontSize || 0.65} onChange={e => handleChange('actOpenCountLabelFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Số lần (VD: "0", "1")</label>
                                        <input type="color" value={config.actOpenCountValueColor || '#fef08a'} onChange={e => handleChange('actOpenCountValueColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Số lần: <span className="text-blue-600 font-bold">{config.actOpenCountValueFontSize || 0.875}rem</span></label>
                                        <input type="range" min="0.6" max="2" step="0.05" value={config.actOpenCountValueFontSize || 0.875} onChange={e => handleChange('actOpenCountValueFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Time Tracking Section */}
                            <div className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
                                <h4 className="font-bold text-gray-800 text-base border-b pb-2 flex items-center gap-2"><span>4️⃣</span> Phần "THỜI GIAN LÀM BÀI" & Lượt học</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Tiêu đề ("THỜI GIAN LÀM BÀI:")</label>
                                        <input type="color" value={config.actTimeHeaderColor || '#ffffff'} onChange={e => handleChange('actTimeHeaderColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Tiêu đề: <span className="text-blue-600 font-bold">{config.actTimeHeaderFontSize || 0.7}rem</span></label>
                                        <input type="range" min="0.5" max="1.5" step="0.05" value={config.actTimeHeaderFontSize || 0.7} onChange={e => handleChange('actTimeHeaderFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Ô Lượt học ("Lần 1...")</label>
                                        <input type="color" value={config.actAttemptBoxBgColor && config.actAttemptBoxBgColor.startsWith('#') ? config.actAttemptBoxBgColor : '#0f172a'} onChange={e => handleChange('actAttemptBoxBgColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Ô Lượt học</label>
                                        <input type="color" value={config.actAttemptTextColor || '#ffffff'} onChange={e => handleChange('actAttemptTextColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Ô Lượt học: <span className="text-blue-600 font-bold">{config.actAttemptFontSize || 0.75}rem</span></label>
                                        <input type="range" min="0.5" max="1.5" step="0.05" value={config.actAttemptFontSize || 0.75} onChange={e => handleChange('actAttemptFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu nền Khung Tổng thời gian</label>
                                        <input type="color" value={config.actTotalTimeBoxBgColor && config.actTotalTimeBoxBgColor.startsWith('#') ? config.actTotalTimeBoxBgColor : '#1e293b'} onChange={e => handleChange('actTotalTimeBoxBgColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Nhãn ("Tổng thời gian đã học:")</label>
                                        <input type="color" value={config.actTotalTimeLabelColor || '#ffffff'} onChange={e => handleChange('actTotalTimeLabelColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Nhãn: <span className="text-blue-600 font-bold">{config.actTotalTimeLabelFontSize || 0.75}rem</span></label>
                                        <input type="range" min="0.5" max="1.5" step="0.05" value={config.actTotalTimeLabelFontSize || 0.75} onChange={e => handleChange('actTotalTimeLabelFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Màu chữ Giá trị (VD: "33 giây")</label>
                                        <input type="color" value={config.actTotalTimeValueColor || '#fef08a'} onChange={e => handleChange('actTotalTimeValueColor', e.target.value)} className="w-full h-10 p-0 border-0 cursor-pointer rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Cỡ chữ Giá trị: <span className="text-blue-600 font-bold">{config.actTotalTimeValueFontSize || 0.875}rem</span></label>
                                        <input type="range" min="0.6" max="2" step="0.05" value={config.actTotalTimeValueFontSize || 0.875} onChange={e => handleChange('actTotalTimeValueFontSize', parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
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
