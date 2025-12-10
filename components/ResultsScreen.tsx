
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
        
        let resultColorClass = 'border-gray-200 bg-white shadow-md';
        if (userDidAnswer) {
            resultColorClass = isCorrect ? 'border-green-500 bg-white ring-2 ring-green-100' : 'border-red-500 bg-white ring-2 ring-red-100';
        }

        const userChoiceText = detail.userAnswer ? `"${detail.userAnswer}"` : "Chưa trả lời";
        
        const optionsHTML = detail.options.map(option => {
            let optionClass = "text-gray-700";
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
                <p className="font-bold text-lg text-gray-900 mb-2">Câu {index + 1}:</p>
                
                <div className="p-3 bg-gray-50 rounded-md mb-3 border border-gray-200">
                    <p className="font-semibold text-blue-900">{detail.question.replace('______', '...')}</p>
                    <p className="text-sm text-gray-600 italic mt-1">{detail.translation.replace('______', '...')}</p>
                    <ul className="list-disc list-inside mt-2 pl-2 space-y-1" dangerouslySetInnerHTML={{ __html: optionsHTML }}>
                    </ul>
                </div>

                <div className="text-left space-y-2 text-gray-800">
                     <p>
                        <span className="font-semibold">Bạn đã chọn:</span> 
                        <span className={`font-bold ${!userDidAnswer ? 'text-gray-400' : isCorrect ? 'text-green-700' : 'text-red-600'}`}>{userChoiceText}</span>
                    </p>
                    <p>
                        <span className="font-semibold">Đáp án đúng:</span> 
                        <span className="font-bold text-green-700">"{detail.correctAnswer}"</span>
                    </p>
                    <div className="mt-2 p-3 bg-blue-50 rounded text-sm border-l-4 border-blue-400">
                        <p className="text-gray-900"><strong className="text-blue-800">Giải thích chi tiết:</strong> {detail.explanation}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-start p-4 sm:p-6 bg-[#1E6543] min-h-[600px] text-white">
            <div id="results-content" className="w-full max-w-4xl p-6 rounded-lg overflow-y-auto max-h-[90vh]">
                
                {/* Score Circle Redesign: Triple Red Border, Times New Roman Font */}
                <div className="w-full text-center mb-8 pt-4">
                    <div className="w-40 h-40 bg-white rounded-full flex flex-col justify-center items-center mx-auto border-4 border-red-600 shadow-[0_0_0_4px_#ffffff,0_0_0_8px_#dc2626]">
                        <span className="text-sm text-gray-500 font-bold font-sans uppercase tracking-wide mb-1">Tổng điểm</span>
                        <span className="text-6xl font-bold text-red-600 font-['Times_New_Roman']">{result.score}</span>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2 text-center" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Kết quả Bài kiểm tra</h2>
                 {isClassroomMode && (
                    <div className="text-center mb-6 bg-white/20 text-white font-semibold p-3 rounded-lg border border-white/30 backdrop-blur-sm">
                        <p>Nộp bài thành công! Kết quả của bạn đã được gửi cho giáo viên.</p>
                    </div>
                )}
                
                {/* Info Container Redesign: White background for student info and stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200 text-gray-800">
                    <div className="space-y-3 text-left text-lg">
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-32">Họ và tên:</span> <span className="font-bold text-blue-700">{result.playerName}</span></p>
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-32">Lớp:</span> <span className="font-bold text-blue-700">{result.playerClass}</span></p>
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-32">Thời gian:</span> <span className="font-bold text-blue-700">{formatTime(result.timeTakenSeconds)}</span></p>
                    </div>
                     <div className="space-y-3 text-left text-lg">
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-40">Số câu đã làm:</span> <span className="font-bold text-blue-700">{result.answered}/{result.totalQuestions}</span></p>
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-40">Số câu đúng:</span> <span className="font-bold text-green-600">{result.correct}</span></p>
                        <p className="flex items-center"><span className="font-semibold text-gray-600 w-40">Số câu sai:</span> <span className="font-bold text-red-600">{result.incorrect}</span></p>
                    </div>
                </div>

                <div className="text-left mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Chi tiết bài làm & Giải thích</h3>
                    <div className="space-y-3">
                        {result.details.length > 0 ? result.details.map(renderDetail) : '<p>Bạn chưa trả lời câu nào.</p>'}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center space-x-8 mt-6 pb-8">
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
