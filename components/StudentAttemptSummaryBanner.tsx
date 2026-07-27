import React, { useEffect, useState } from 'react';
import { PlayerData } from '../types';
import { listenToStudentActivityAttempts, ActivityAttemptCounts } from '../services/firebaseService';

interface StudentAttemptSummaryBannerProps {
    classroomId: string;
    grade: number | 'topics';
    unitNumber: number;
    playerData: PlayerData;
    currentActivityType?: 'vocabulary' | 'matching' | 'spelling' | 'quiz';
}

const StudentAttemptSummaryBanner: React.FC<StudentAttemptSummaryBannerProps> = ({
    classroomId,
    grade,
    unitNumber,
    playerData,
    currentActivityType
}) => {
    const [attempts, setAttempts] = useState<ActivityAttemptCounts>({
        vocabulary: 0,
        matching: 0,
        spelling: 0,
        quiz: 0
    });

    useEffect(() => {
        if (!classroomId || !playerData || !unitNumber) return;
        const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const unsub = listenToStudentActivityAttempts(
            classroomId,
            grade,
            unitId,
            playerData.name,
            playerData.class,
            (counts) => setAttempts(counts)
        );
        return () => {
            if (unsub) unsub();
        };
    }, [classroomId, grade, unitNumber, playerData?.name, playerData?.class]);

    const unitLabel = grade === 'topics' ? `TOPIC ${unitNumber}` : `UNIT ${unitNumber}`;

    const items = [
        { type: 'vocabulary', label: 'Học từ vựng', icon: '📖', color: 'bg-blue-50 text-blue-900 border-blue-200', badgeColor: 'bg-blue-600 text-white', count: attempts.vocabulary },
        { type: 'matching', label: 'Ghép cặp', icon: '🧩', color: 'bg-purple-50 text-purple-900 border-purple-200', badgeColor: 'bg-purple-600 text-white', count: attempts.matching },
        { type: 'spelling', label: 'Viết chính tả', icon: '✏️', color: 'bg-orange-50 text-orange-900 border-orange-200', badgeColor: 'bg-orange-600 text-white', count: attempts.spelling },
        { type: 'quiz', label: 'Trắc nghiệm', icon: '📝', color: 'bg-green-50 text-green-900 border-green-200', badgeColor: 'bg-green-600 text-white', count: attempts.quiz },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-4 shadow-md mb-4 text-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <h3 className="text-sm sm:text-base font-extrabold text-amber-900 uppercase tracking-wide">
                        THÔNG BÁO SỐ LẦN THAM GIA ({unitLabel}):
                    </h3>
                </div>
                {playerData && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-full border border-amber-300">
                        👤 {playerData.name} - Lớp {playerData.class}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {items.map((item) => {
                    const isActive = currentActivityType === item.type;
                    return (
                        <div
                            key={item.type}
                            className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
                                isActive
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400 ring-offset-1 scale-[1.02]'
                                    : `${item.color} hover:shadow-sm`
                            }`}
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-base sm:text-lg">{item.icon}</span>
                                <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-medium opacity-90">SỐ LẦN LÀM:</span>
                                <span className={`text-sm sm:text-base font-black px-2 py-0.5 rounded-full ${
                                    isActive ? 'bg-white text-amber-900 font-extrabold shadow-sm' : item.badgeColor
                                }`}>
                                    {item.count}
                                </span>
                            </div>
                            {isActive && (
                                <span className="text-[10px] font-extrabold text-yellow-100 mt-1 uppercase tracking-wider">
                                    ★ Đang tham gia ★
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentAttemptSummaryBanner;
