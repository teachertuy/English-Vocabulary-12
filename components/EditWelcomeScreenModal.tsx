
import React, { useState, useEffect } from 'react';
import { WelcomeScreenConfig } from '../types';

interface EditWelcomeScreenModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: WelcomeScreenConfig) => Promise<void>;
    currentConfig: WelcomeScreenConfig | null;
}

const DEFAULT_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY\n12',
    titleFontSize: 2,
    titleFontSizeLine2: 5,
    titleColor: '#facc15',
    titleLineGap: 0,
    titleLetterSpacing1: 0.05,
    titleLetterSpacing2: -0.08,
    titleCurveArc: 35,
    logoSize: 64,
    logoNameGap: -6,
    logoTitleGap: 16,
    logoPosition: 'left',
    teacherNameText: '{teachertuy}',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ff0000',
    inputNamePlaceholder: 'YOUR NAME',
    inputNameBorderColor: '#d4d44d',
    inputNameBorderWidth: 4,
    inputClassWidth: 50,
    inputClassFontSize: 1.25,
    inputClassColor: '#0000ff',
    inputClassPlaceholder: 'CLASS',
    inputClassBorderColor: '#a88a32',
    inputClassBorderWidth: 4,
    startButtonText: 'START',
    startButtonSize: 84,
    startButtonBgColor: '#facc15',
    startButtonTextColor: '#ff0000',
    startButtonRingColor: '#ffffff',
    startButtonRingWidth: 3
};

const TitlePreview: React.FC<{ config: WelcomeScreenConfig }> = ({ config }) => {
    const rawText = config.titleText || 'ENGLISH VOCABULARY\n12';
    const lines = rawText.split('\n').filter(l => l.trim() !== '');
    const titleLines = lines.length > 1 ? lines.slice(0, 2) : [rawText];
    const lineGap = config.titleLineGap ?? 0;
    const arc = config.titleCurveArc ?? 35;
    const letterSpacing1 = config.titleLetterSpacing1 ?? 0.05;
    const letterSpacing2 = config.titleLetterSpacing2 ?? -0.08;

    const logoSize = config.logoSize ?? 64;
    const logoNameGap = config.logoNameGap ?? -6;
    const logoTitleGap = config.logoTitleGap ?? 16;
    const logoPosition = config.logoPosition || 'left';
    const teacherName = config.teacherNameText || '{teachertuy}';

    const y1Base = 55;
    const y1Control = Math.max(0, y1Base - arc);
    const d1 = `M 40, ${y1Base} Q 250, ${y1Control} 460, ${y1Base}`;

    const y2Base = 135 + lineGap;
    const y2Control = Math.max(0, y2Base - Math.round(arc * 0.7));
    const d2 = `M 20, ${y2Base} Q 250, ${y2Control} 480, ${y2Base}`;

    const viewBoxHeight = titleLines.length > 1 ? Math.max(120, 165 + lineGap) : Math.max(70, 85 + arc);

    return (
        <div className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 my-2 flex flex-col items-center justify-center shadow-inner overflow-hidden relative min-h-[220px]">
            <div className="absolute top-2 left-3 bg-slate-800 text-yellow-400 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-slate-700 tracking-wider z-20">
                👁️ Xem trước trực tiếp giao diện
            </div>

            {/* Logo Preview */}
            <div className={`w-full flex ${logoPosition === 'center' ? 'justify-center mt-6' : 'justify-start pl-2 pt-2'}`}>
                <div className="flex flex-col items-center">
                    <img 
                        src="https://github.com/teachertuy/anhlogoto.canhan/blob/main/11zon_cropped.png?raw=true" 
                        alt="Logo" 
                        referrerPolicy="no-referrer"
                        className="rounded-full border-2 border-yellow-300 shadow object-cover" 
                        style={{ width: `${logoSize * 0.85}px`, height: `${logoSize * 0.85}px` }}
                    />
                    <span 
                        className="text-white font-bold text-[10px] pointer-events-none select-none text-yellow-300"
                        style={{ marginTop: `${logoNameGap}px` }}
                    >
                        {teacherName}
                    </span>
                </div>
            </div>

            {/* SVG Title Preview */}
            <div 
                className="w-full max-w-[340px] transition-all duration-200" 
                style={{ 
                    marginTop: logoPosition === 'center' ? `${logoTitleGap * 0.8}px` : `${Math.max(4, logoTitleGap * 0.5)}px`,
                    height: titleLines.length > 1 ? `${Math.max(4.5, 7.5 + lineGap / 20)}rem` : '4.5rem' 
                }}
            >
                <svg viewBox={`0 0 500 ${viewBoxHeight}`} className="w-full h-full overflow-visible">
                    <path id="preview_curve1" d={d1} stroke="transparent" fill="transparent"/>
                    <text width="500" style={{ fill: config.titleColor || '#facc15', filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))', fontSize: `${config.titleFontSize}rem`, letterSpacing: `${letterSpacing1}em` }} className="font-black uppercase">
                        <textPath href="#preview_curve1" startOffset="50%" textAnchor="middle">
                            {titleLines[0]}
                        </textPath>
                    </text>
                    
                    {titleLines.length > 1 && (
                        <>
                            <path id="preview_curve2" d={d2} stroke="transparent" fill="transparent"/>
                            <text width="500" style={{ fill: config.titleColor || '#facc15', filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))', fontSize: `${config.titleFontSizeLine2 || (config.titleFontSize * 0.85)}rem`, letterSpacing: `${letterSpacing2}em` }} className="font-black uppercase opacity-95">
                                <textPath href="#preview_curve2" startOffset="50%" textAnchor="middle">
                                    {titleLines[1]}
                                </textPath>
                            </text>
                        </>
                    )}
                </svg>
            </div>
        </div>
    );
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

    const SectionHeader = ({ icon, title, colorClass }: { icon: string, title: string, colorClass: string }) => (
        <h3 className={`text-lg font-bold ${colorClass} border-b pb-2 mb-4 flex items-center gap-2`}>
            <span>{icon}</span> {title}
        </h3>
    );

    const RangeInput = ({ label, value, unit, min, max, step, onChange }: any) => (
        <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
                {label}: <span className="text-blue-600 font-bold">{value}{unit}</span>
            </label>
            <input 
                type="range" 
                min={min} max={max} step={step} 
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Thiết kế màn hình đăng nhập</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold transition">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    {/* Phần 1: Tiêu đề */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm space-y-4">
                        <SectionHeader icon="🏷️" title="Tiêu đề & Tùy chỉnh Khoảng cách / Độ rộng hàng" colorClass="text-blue-700" />
                        
                        {/* Live Preview Box */}
                        <TitlePreview config={config} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Nội dung Tiêu đề <span className="text-xs text-blue-600 font-normal">(Dùng \n để ngắt thành 2 dòng)</span>
                                    </label>
                                    <textarea 
                                        value={config.titleText} 
                                        onChange={e => handleChange('titleText', e.target.value.toUpperCase())}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-extrabold uppercase min-h-[90px] bg-slate-50 text-base"
                                        placeholder="ENGLISH VOCABULARY&#10;12"
                                    />
                                </div>
                                <RangeInput 
                                    label="📏 Khoảng cách giữa 2 hàng tiêu đề" 
                                    value={config.titleLineGap ?? 0} 
                                    unit="px" 
                                    min={-50} 
                                    max={90} 
                                    step={1} 
                                    onChange={(v: number) => handleChange('titleLineGap', v)} 
                                />
                                <RangeInput 
                                    label="↪️ Độ cong vồng hàng tiêu đề" 
                                    value={config.titleCurveArc ?? 35} 
                                    unit="px" 
                                    min={0} 
                                    max={60} 
                                    step={1} 
                                    onChange={(v: number) => handleChange('titleCurveArc', v)} 
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <RangeInput label="Cỡ chữ Dòng 1" value={config.titleFontSize} unit="rem" min={1} max={5} step={0.1} onChange={(v: number) => handleChange('titleFontSize', v)} />
                                    <RangeInput label="Cỡ chữ Dòng 2" value={config.titleFontSizeLine2} unit="rem" min={1} max={8} step={0.1} onChange={(v: number) => handleChange('titleFontSizeLine2', v)} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <RangeInput label="Độ giãn/rộng Dòng 1" value={config.titleLetterSpacing1 ?? 0.05} unit="em" min={-0.15} max={0.6} step={0.01} onChange={(v: number) => handleChange('titleLetterSpacing1', v)} />
                                    <RangeInput label="Độ giãn/rộng Dòng 2" value={config.titleLetterSpacing2 ?? -0.08} unit="em" min={-0.2} max={0.8} step={0.01} onChange={(v: number) => handleChange('titleLetterSpacing2', v)} />
                                </div>

                                <ColorInput label="Màu sắc tiêu đề" value={config.titleColor} onChange={(v: string) => handleChange('titleColor', v)} />
                            </div>
                        </div>
                    </div>

                    {/* Phần Tùy chỉnh Logo & Cụm Tiêu đề */}
                    <div className="p-4 border rounded-xl bg-slate-50 border-blue-200 shadow-sm space-y-4">
                        <SectionHeader icon="🖼️" title="Logo Giáo viên, Tên & Khoảng cách với Tiêu đề" colorClass="text-indigo-700" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">📍 Vị trí hiển thị Logo</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('logoPosition', 'left')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition ${
                                                (config.logoPosition || 'left') === 'left'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            ↖️ Góc trên bên trái
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('logoPosition', 'center')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition ${
                                                config.logoPosition === 'center'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            ⬆️ Căn giữa phía trên Tiêu đề
                                        </button>
                                    </div>
                                </div>

                                <RangeInput 
                                    label="📸 Kích thước Logo ảnh" 
                                    value={config.logoSize ?? 64} 
                                    unit="px" 
                                    min={30} 
                                    max={120} 
                                    step={2} 
                                    onChange={(v: number) => handleChange('logoSize', v)} 
                                />

                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">✏️ Tên hiển thị dưới Logo</label>
                                    <input 
                                        type="text" 
                                        value={config.teacherNameText ?? '{teachertuy}'} 
                                        onChange={e => handleChange('teacherNameText', e.target.value)} 
                                        className="w-full p-2 border border-gray-300 rounded text-sm font-bold bg-white"
                                        placeholder="{teachertuy}" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <RangeInput 
                                    label="↔️ Khoảng cách giữa Logo ảnh & Tên" 
                                    value={config.logoNameGap ?? -6} 
                                    unit="px" 
                                    min={-20} 
                                    max={30} 
                                    step={1} 
                                    onChange={(v: number) => handleChange('logoNameGap', v)} 
                                />

                                <RangeInput 
                                    label="↕️ Khoảng cách Cụm Logo/Tên & Tiêu đề ENGLISH VOCABULARY 12" 
                                    value={config.logoTitleGap ?? 16} 
                                    unit="px" 
                                    min={-20} 
                                    max={100} 
                                    step={2} 
                                    onChange={(v: number) => handleChange('logoTitleGap', v)} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Phần 2: Khung Họ Tên */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <SectionHeader icon="👤" title="Khung Nhập Họ Tên" colorClass="text-amber-700" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gợi ý (Placeholder)</label>
                                    <input type="text" value={config.inputNamePlaceholder} onChange={e => handleChange('inputNamePlaceholder', e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                                </div>
                                <RangeInput label="Cỡ chữ nhập" value={config.inputNameFontSize} unit="rem" min={0.5} max={3} step={0.05} onChange={(v: number) => handleChange('inputNameFontSize', v)} />
                            </div>
                            <div className="space-y-4">
                                <ColorInput label="Màu viền" value={config.inputNameBorderColor} onChange={(v: string) => handleChange('inputNameBorderColor', v)} />
                                <RangeInput label="Độ rộng (%)" value={config.inputNameWidth} unit="%" min={5} max={100} step={1} onChange={(v: number) => handleChange('inputNameWidth', v)} />
                            </div>
                            <div className="space-y-4">
                                <RangeInput label="Độ dày viền" value={config.inputNameBorderWidth} unit="px" min={0} max={10} step={1} onChange={(v: number) => handleChange('inputNameBorderWidth', v)} />
                                <ColorInput label="Màu chữ nhập" value={config.inputNameColor} onChange={(v: string) => handleChange('inputNameColor', v)} />
                            </div>
                        </div>
                    </div>

                    {/* Phần 3: Khung Lớp */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <SectionHeader icon="🏫" title="Khung Nhập Lớp" colorClass="text-red-700" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Gợi ý (Placeholder)</label>
                                    <input type="text" value={config.inputClassPlaceholder} onChange={e => handleChange('inputClassPlaceholder', e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                                </div>
                                <RangeInput label="Cỡ chữ nhập" value={config.inputClassFontSize} unit="rem" min={0.5} max={3} step={0.05} onChange={(v: number) => handleChange('inputClassFontSize', v)} />
                            </div>
                            <div className="space-y-4">
                                <ColorInput label="Màu viền" value={config.inputClassBorderColor} onChange={(v: string) => handleChange('inputClassBorderColor', v)} />
                                <RangeInput label="Độ rộng (%)" value={config.inputClassWidth} unit="%" min={5} max={100} step={1} onChange={(v: number) => handleChange('inputClassWidth', v)} />
                            </div>
                            <div className="space-y-4">
                                <RangeInput label="Độ dày viền" value={config.inputClassBorderWidth} unit="px" min={0} max={10} step={1} onChange={(v: number) => handleChange('inputClassBorderWidth', v)} />
                                <ColorInput label="Màu chữ nhập" value={config.inputClassColor} onChange={(v: string) => handleChange('inputClassColor', v)} />
                            </div>
                        </div>
                    </div>

                    {/* Phần 4: Nút START */}
                    <div className="p-4 border rounded-xl bg-white shadow-sm">
                        <SectionHeader icon="▶️" title="Nút bấm START" colorClass="text-blue-600" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Văn bản nút</label>
                                <input type="text" value={config.startButtonText} onChange={e => handleChange('startButtonText', e.target.value)} className="w-full p-2 border border-gray-300 rounded font-bold" />
                            </div>
                            <ColorInput label="Màu nền nút" value={config.startButtonBgColor} onChange={(v: string) => handleChange('startButtonBgColor', v)} />
                            <ColorInput label="Màu chữ" value={config.startButtonTextColor} onChange={(v: string) => handleChange('startButtonTextColor', v)} />
                            <ColorInput label="Màu vòng nhẫn" value={config.startButtonRingColor} onChange={(v: string) => handleChange('startButtonRingColor', v)} />
                            <div className="md:col-span-2">
                                <RangeInput label="Kích thước nút" value={config.startButtonSize} unit="px" min={40} max={200} step={1} onChange={(v: number) => handleChange('startButtonSize', v)} />
                            </div>
                            <div className="md:col-span-2">
                                <RangeInput label="Độ dày vòng nhẫn" value={config.startButtonRingWidth} unit="px" min={0} max={10} step={1} onChange={(v: number) => handleChange('startButtonRingWidth', v)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition" disabled={isSaving}>Hủy bỏ</button>
                    <button onClick={handleSave} className="px-10 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-lg disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? 'Đang lưu...' : 'Lưu tất cả thiết kế'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWelcomeScreenModal;
