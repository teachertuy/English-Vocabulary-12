import React, { useState } from 'react';

// Function to generate a simple random ID
const generateClassroomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

interface ClassroomHostProps {
    onHostSession: (classroomId: string) => void;
}

const ClassroomHost: React.FC<ClassroomHostProps> = ({ onHostSession }) => {
    const [classroomId] = useState(generateClassroomId());
    const [copied, setCopied] = useState(false);

    const shareableLink = `${window.location.origin}${window.location.pathname}?classroomId=${classroomId}`;

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        });
    };
    
    const handleStart = () => {
        window.history.pushState({}, '', shareableLink);
        onHostSession(classroomId);
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[600px] blueprint-bg">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20">
                <h1 className="text-3xl font-extrabold text-white mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Tạo Lớp học Trực tuyến</h1>
                <p className="text-white/90 mb-6">Tạo một phòng học để học sinh tham gia và bắt đầu làm bài kiểm tra. Kết quả sẽ được cập nhật trực tiếp.</p>
                
                <div className="mb-6">
                    <p className="text-white/90 font-semibold mb-2">Mã lớp của bạn:</p>
                    <div className="text-4xl font-mono tracking-widest text-yellow-300 p-3 bg-black/30 rounded-lg">
                        {classroomId}
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-white/90 font-semibold mb-2">Chia sẻ liên kết này cho học sinh:</p>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={shareableLink}
                            className="w-full px-3 py-2 border-0 rounded-lg text-sm bg-gray-200 text-blue-800 font-semibold select-all"
                        />
                        <button 
                            onClick={handleCopyToClipboard}
                            className="bg-yellow-400 text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition shadow-md"
                        >
                            {copied ? 'Đã chép!' : 'Chép'}
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={handleStart} 
                    className="w-full bg-green-500 text-white py-4 rounded-full font-extrabold text-xl shadow-lg transform hover:scale-105 transition-transform duration-300 border-4 border-white"
                >
                    Bắt đầu & Xem Bảng điều khiển
                </button>
            </div>
        </div>
    );
};

export default ClassroomHost;
