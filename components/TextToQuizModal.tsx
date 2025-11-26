import React, { useState, useCallback, useEffect } from 'react';

declare global {
    interface Window {
        mammoth: any;
        pdfjsLib: any;
    }
}

// Set up the PDF.js worker
if (typeof window !== 'undefined' && window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
}

interface TextToQuizModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (text: string) => Promise<void>;
    isGenerating: boolean;
}

const TextToQuizModal: React.FC<TextToQuizModalProps> = ({ show, onClose, onSubmit, isGenerating }) => {
    const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
    const [pastedText, setPastedText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileText, setFileText] = useState('');
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show) {
            // Reset state when modal is closed
            setPastedText('');
            setSelectedFile(null);
            setFileText('');
            setError(null);
            setActiveTab('paste');
        }
    }, [show]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setIsProcessingFile(true);
        setFileText('');
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            let text = '';
            
            if (file.type === 'application/pdf' && window.pdfjsLib) {
                const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                }
            } else if (file.name.endsWith('.docx') && window.mammoth) {
                const result = await window.mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else {
                throw new Error('Loại tệp không được hỗ trợ. Vui lòng tải lên tệp .docx hoặc .pdf.');
            }

            if(!text.trim()){
                 throw new Error('Không thể trích xuất văn bản từ tệp này. Tệp có thể trống hoặc bị hỏng.');
            }
            setFileText(text);
        } catch (err) {
            console.error("File processing error:", err);
            setError(err instanceof Error ? err.message : 'Không thể xử lý tệp.');
            setSelectedFile(null);
        } finally {
            setIsProcessingFile(false);
        }
    }, []);

    const handleSubmit = async () => {
        const textToSubmit = activeTab === 'paste' ? pastedText : fileText;
        if (!textToSubmit.trim()) {
            setError('Vui lòng cung cấp văn bản để tạo đề.');
            return;
        }
        setError(null);
        try {
            await onSubmit(textToSubmit);
        } catch (err) {
            setError('Tạo đề thất bại. Vui lòng thử lại.');
        }
    };
    
    if (!show) return null;

    const isSubmitDisabled = isGenerating || isProcessingFile || (activeTab === 'paste' && !pastedText.trim()) || (activeTab === 'upload' && !fileText.trim());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Tạo đề thi từ văn bản</h2>
                    <p className="text-sm text-gray-600">Dán văn bản hoặc tải lên tệp để AI tạo câu hỏi dựa trên nội dung.</p>
                </div>

                <div className="p-4 flex-grow overflow-y-auto">
                    <div className="flex border-b mb-4">
                        <button onClick={() => setActiveTab('paste')} className={`py-2 px-4 font-semibold ${activeTab === 'paste' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Dán văn bản</button>
                        <button onClick={() => setActiveTab('upload')} className={`py-2 px-4 font-semibold ${activeTab === 'upload' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Tải lên tệp</button>
                    </div>

                    {activeTab === 'paste' ? (
                        <div>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Dán văn bản của bạn vào đây (ví dụ: một câu chuyện, bài báo, đoạn hội thoại)..."
                                className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isGenerating}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <input
                                type="file"
                                accept=".docx,.pdf"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                disabled={isProcessingFile || isGenerating}
                            />
                            {isProcessingFile && <p className="mt-4 text-blue-600">Đang xử lý tệp...</p>}
                            {selectedFile && !isProcessingFile && (
                                <div className="mt-4 w-full p-3 border border-gray-200 rounded-md bg-gray-50 max-h-48 overflow-y-auto">
                                    <p className="font-semibold text-sm text-gray-800 mb-2">Nội dung đã trích xuất từ <span className="font-bold">{selectedFile.name}</span>:</p>
                                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{fileText ? fileText.substring(0, 500) + '...' : 'Không có nội dung.'}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {error && <p className="text-red-500 font-semibold mt-2 text-center">{error}</p>}
                </div>
                
                <div className="p-4 border-t flex justify-end items-center gap-4">
                     <button onClick={onClose} className="text-gray-600 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition" disabled={isGenerating}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>{isGenerating ? 'Đang tạo đề...' : 'Tạo đề'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TextToQuizModal;
