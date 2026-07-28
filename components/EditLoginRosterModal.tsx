import React, { useState, useEffect } from 'react';
import { LoginRosterConfig, ClassRosterColumn } from '../types';

interface EditLoginRosterModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (config: LoginRosterConfig) => Promise<void>;
    currentConfig: LoginRosterConfig | null;
}

const DEFAULT_ROSTER_CONFIG: LoginRosterConfig = {
    enabled: true,
    columns: [
        { classId: '', studentList: '' },
        { classId: '', studentList: '' },
        { classId: '', studentList: '' },
        { classId: '', studentList: '' },
    ]
};

const EditLoginRosterModal: React.FC<EditLoginRosterModalProps> = ({ show, onClose, onSave, currentConfig }) => {
    const [config, setConfig] = useState<LoginRosterConfig>(currentConfig || DEFAULT_ROSTER_CONFIG);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (show) {
            if (currentConfig && currentConfig.columns && currentConfig.columns.length > 0) {
                // Ensure there are always 4 columns
                const cols = [...currentConfig.columns];
                while (cols.length < 4) {
                    cols.push({ classId: '', studentList: '' });
                }
                setConfig({ enabled: currentConfig.enabled ?? true, columns: cols.slice(0, 4) });
            } else {
                setConfig(DEFAULT_ROSTER_CONFIG);
            }
        }
    }, [show, currentConfig]);

    if (!show) return null;

    const handleColumnChange = (index: number, field: keyof ClassRosterColumn, value: string) => {
        const newCols = [...config.columns];
        newCols[index] = { ...newCols[index], [field]: value };
        setConfig(prev => ({ ...prev, columns: newCols }));
    };

    const handleToggleEnabled = (enabled: boolean) => {
        setConfig(prev => ({ ...prev, enabled }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(config);
            onClose();
        } catch (error) {
            console.error("Failed to save login roster config:", error);
            alert("Lưu thiết kế đăng nhập thất bại!");
        } finally {
            setIsSaving(false);
        }
    };

    const countStudents = (text: string) => {
        if (!text) return 0;
        return text.split(/[\n,;]/).map(s => s.trim()).filter(s => s.length > 0).length;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[160] p-3 sm:p-5" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🔐</span>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black">Thiết kế đăng nhập</h2>
                            <p className="text-xs sm:text-sm opacity-90">Quản lý danh sách Lớp & Học sinh được phép đăng nhập vào ứng dụng</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold transition-all"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-grow space-y-5 bg-slate-50">
                    {/* Master Switch Card */}
                    <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <span className="font-extrabold text-gray-800 text-base block flex items-center gap-2">
                                🛡️ Kiểm duyệt danh sách HS khi đăng nhập:
                            </span>
                            <span className="text-xs text-gray-500 block mt-0.5">
                                Khi <strong className="text-emerald-600">BẬT</strong>, học sinh đăng nhập bắt buộc phải viết đúng tên giáo viên đã thiết lập bên dưới.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleEnabled(!config.enabled)}
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all border ${
                                config.enabled 
                                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200' 
                                    : 'bg-gray-200 text-gray-700 border-gray-300'
                            }`}
                        >
                            <span className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-white animate-pulse' : 'bg-gray-500'}`}></span>
                            <span>{config.enabled ? 'Đang BẬT (Bắt buộc kiểm tra)' : 'Đang TẮT (Cho phép tự do)'}</span>
                        </button>
                    </div>

                    {/* Instruction Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                        <span className="text-lg shrink-0">💡</span>
                        <div>
                            <strong>Hướng dẫn thiết lập 4 Cột:</strong> Mỗi cột đại diện cho 1 Lớp. Nhập tên Lớp (ví dụ: <code className="bg-amber-100 px-1 py-0.5 rounded font-bold">12A</code>) và dán danh sách Họ và tên học sinh tương ứng (mỗi học sinh trên 1 dòng hoặc cách nhau bởi dấu phẩy).
                        </div>
                    </div>

                    {/* 4 Columns Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {config.columns.map((col, idx) => {
                            const count = countStudents(col.studentList);
                            return (
                                <div 
                                    key={idx} 
                                    className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm hover:border-teal-400 transition-all flex flex-col h-full"
                                >
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <span className="bg-teal-600 text-white text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                                            CỘT {idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                            {count} HS
                                        </span>
                                    </div>

                                    {/* Item 1: Lớp */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-tight">
                                            🏫 LỚP:
                                        </label>
                                        <input
                                            type="text"
                                            value={col.classId}
                                            onChange={(e) => handleColumnChange(idx, 'classId', e.target.value)}
                                            placeholder={`Ví dụ: 12A${idx + 1}`}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50 uppercase"
                                        />
                                    </div>

                                    {/* Item 2: Họ tên HS */}
                                    <div className="flex-grow flex flex-col">
                                        <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-tight">
                                            👤 HỌ TÊN HS:
                                        </label>
                                        <textarea
                                            value={col.studentList}
                                            onChange={(e) => handleColumnChange(idx, 'studentList', e.target.value)}
                                            placeholder={`Nguyễn Văn Hà\nLê Anh Vũ\n...`}
                                            className="w-full flex-grow h-44 sm:h-52 p-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50 font-mono leading-relaxed resize-none"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang lưu...</span>
                            </>
                        ) : (
                            <>
                                <span>💾 Lưu thiết kế đăng nhập</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditLoginRosterModal;
