
import React from 'react';

interface Props {
  onSelect: (type: number | 'topics') => void;
  onBack: () => void;
}

const Card: React.FC<{ title: string, icon: string, color: string, onClick: () => void }> = ({ title, icon, color, onClick }) => (
    <button 
      onClick={onClick} 
      className={`w-full h-40 rounded-2xl p-6 flex flex-col items-center justify-center text-white font-bold text-2xl shadow-lg transform transition duration-300 hover:scale-105 ${color}`}
    >
        <span className="text-4xl mb-2">{icon}</span>
        <span className={title.length > 15 ? 'text-xl' : 'text-2xl'}>{title}</span>
    </button>
);

const ExerciseTypeSelectionScreen: React.FC<Props> = ({ onSelect, onBack }) => {
    return (
        <div className="flex flex-col items-center p-6 text-center min-h-[600px] bg-gray-50 relative">
            <button onClick={onBack} className="absolute top-6 left-6 flex items-center bg-white px-4 py-2 rounded-lg shadow font-semibold text-gray-700 hover:bg-gray-200 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại
            </button>
            <div className="w-full max-w-4xl mx-auto mt-16">
                <div className="mb-10">
                    <h1 className="relative inline-block text-3xl font-extrabold text-red-600 pb-4">
                        TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ
                        <span className="absolute bottom-[8px] left-0 w-full h-0.5 bg-pink-500"></span>
                        <span className="absolute bottom-[4px] left-0 w-full h-0.5 bg-black"></span>
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></span>
                    </h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="English 12" icon="📝" color="bg-blue-500" onClick={() => onSelect(12)} />
                    <Card title="Topic-based vocabulary" icon="📰" color="bg-purple-500" onClick={() => onSelect('topics')} />
                </div>
            </div>
        </div>
    );
};

export default ExerciseTypeSelectionScreen;