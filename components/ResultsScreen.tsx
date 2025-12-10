
import React from 'react';
import { GameResult, QuizAnswerDetail } from '../types';

interface ResultsScreenProps {
  result: GameResult;
  onBack: () => void;
  onLogout: () => void;
  isClassroomMode: boolean;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onBack, onLogout, isClassroomMode }) => {

    const renderDetail = (detail: QuizAnswerDetail, index: number) => {
        const isCorrect = detail.status === 'correct';
        const userDidAnswer = detail.status !== null;
        
        // Changed background to white, adjusted borders to be clearer
        let resultColorClass = 'border-gray-200 bg-white shadow-sm';
        if (userDidAnswer) {
            resultColorClass = isCorrect ? 'border-green-500 bg-white ring-1 ring-green-500' : 'border-red-500 bg-white ring-1 ring-red-500';
        }

        const userChoiceText = detail.userAnswer ? `"${detail.userAnswer}"` : "Chưa trả lời";
        
        // Updated text colors for white background
        const optionsHTML = detail.options.map(option => {
            let optionClass = "text-gray-600";
            if (option === detail.correctAnswer) {
                optionClass = "font-bold text-green-700";
            }
            if (option === detail.userAnswer && !isCorrect) {
                optionClass = "font-bold text-red-600 line-through";
            }
             return `<li class="${optionClass}">${option}</li>`;
        }).join('');

        return (
            <div key={index} className={`p-5 rounded-xl mb-4 border-2 ${resultColorClass}`}>
                <p className="font-bold text-lg text-gray-800 mb-2">Câu {index + 1}:</p>
                
                {/* Changed inner box to light gray */}
                <div className="p-3 bg-gray-100 rounded-md mb-3 border border-gray-200">
                    <p className="font-semibold text-blue-800">{detail.question.replace('______', '...')}</p>
                    <p className="text-sm text-gray-600 italic mt-1">{detail.translation.replace('______', '...')}</p>
                    <ul className="list-disc list-inside mt-2 pl-2 space-y-1" dangerouslySetInnerHTML={{ __html: optionsHTML }}>
                    </ul>
                </div>

                {/* Updated text colors to dark gray/black */}
                <div className="text-left space-y-2 text-gray-700">
                     <p>
                        <span className="font-semibold">Bạn đã chọn:</span> 
                        <span className={`font-bold ${!userDidAnswer ? 'text-gray-400' : isCorrect ? 'text-green-600' : 'text-red-600'}`}>{userChoiceText}</span>
                    </p>
                    <p>
                        <span className="font-semibold">Đáp án đúng:</span> 
                        <span className="font-bold text-green-600">"{detail.correctAnswer}"</span>
                    </p>
                    {/* Changed explanation box to light blue */}
                    <div className="mt-2 p-3 bg-blue-50 rounded text-sm border-l-4 border-blue-500">
                        <p className="text-gray-800"><strong className="text-blue-800">Giải thích chi tiết:</strong> {detail.explanation}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-start p-4 sm:p-6 bg-[#1E6543] min-h-[600px] text-white">
            <div id="results-content" className="w-full max-w-4xl p-6 rounded-lg overflow-y-auto max-h-[90vh]">
                <div className="w-full text-center mb-8">
                    <div className="w-40 h-40 bg-slate-800/50 rounded-full flex flex-col justify-center items-center shadow-2xl mx-auto" style={{boxShadow: '0 0 0 5px rgba(239, 68, 68, 0.7), 0 0 0 10px rgba(250, 204, 21, 0.7), 0 0 0 15px rgba(34, 197, 94, 0.7)'}}>
                        <span className="text-sm text-slate-300 font-bold">Tổng điểm</span>
                        <span className="text-5xl font-extrabold text-yellow-300" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>{result.score}</span>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 text-center" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Kết quả Bài kiểm tra</h2>
                 {isClassroomMode && (
                    <div className="text-center mb-6 bg-green-500/30 text-green-200 font-semibold p-3 rounded-lg border border-green-400/50">
                        <p>Nộp bài thành công! Kết quả của bạn đã được gửi cho giáo viên.</p>
                    </div>
                )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-slate-600">
                    <div className="space-y-3 text-left text-lg">
                        <p><span className="font-semibold text-sky-300">Họ và tên:</span> <span className="font-bold text-orange-300">{result.playerName}</span></p>
                        <p><span className="font-semibold text-sky-300">Lớp:</span> <span className="font-bold text-orange-300">{result.playerClass}</span></p>
                        <p><span className="font-semibold text-sky-300">Tổng thời gian làm bài:</span> <span className="font-bold text-orange-300">{formatTime(result.timeTakenSeconds)}</span></p>
                    </div>
                     <div className="space-y-3 text-left text-lg">
                        <p><span className="font-semibold text-sky-300">Số lượng câu đã làm:</span> <span className="font-bold text-orange-300">{result.answered}/{result.totalQuestions}</span></p>
                        <p><span className="font-semibold text-sky-300">Số câu đúng:</span> <span className="font-bold text-green-400">{result.correct}</span></p>
                        <p><span className="font-semibold text-sky-300">Số câu sai:</span> <span className="font-bold text-red-400">{result.incorrect}</span></p>
                    </div>
                </div>
                <div className="text-left mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Chi tiết bài làm & Giải thích</h3>
                    <div className="space-y-3">
                        {result.details.length > 0 ? result.details.map(renderDetail) : '<p>Bạn chưa trả lời câu nào.</p>'}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center space-x-8 mt-6">
                 <button onClick={onBack} className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-white/30 transition shadow-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>
                <button onClick={onLogout} className="bg-red-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-red-700 transition shadow-lg">Logout</button>
            </div>
        </div>
    );
};

export default ResultsScreen;
