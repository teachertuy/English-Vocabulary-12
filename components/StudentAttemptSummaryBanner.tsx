import React, { useEffect, useState } from 'react';
import { PlayerData } from '../types';
import { listenToStudentActivityAttempts, ActivityAttemptCounts, AttemptDetail } from '../services/firebaseService';

interface StudentAttemptSummaryBannerProps {
    classroomId: string;
    grade: number | 'topics';
    unitNumber: number;
    playerData: PlayerData;
    currentActivityType?: 'vocabulary' | 'matching' | 'spelling' | 'quiz';
}

const formatDuration = (totalSecs: number) => {
    if (!totalSecs || totalSecs <= 0) return '0 giây';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} giây`;
    if (secs === 0) return `${mins} phút`;
    return `${mins} phút ${secs} giây`;
};

const formatDateMonth = (timestamp: any) => {
    if (!timestamp) return '';
    let d: Date | null = null;
    if (typeof timestamp === 'number') {
        d = new Date(timestamp);
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
        d = new Date(timestamp.seconds * 1000);
    }
    if (d && !isNaN(d.getTime())) {
        return ` (${d.getDate()}/${d.getMonth() + 1})`;
    }
    return '';
};

const defaultStats = () => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] as AttemptDetail[] });

const StudentAttemptSummaryBanner: React.FC<StudentAttemptSummaryBannerProps> = ({
    classroomId,
    grade,
    unitNumber,
    playerData,
    currentActivityType
}) => {
    const [attempts, setAttempts] = useState<ActivityAttemptCounts>({
        vocabulary: defaultStats(),
        matching: defaultStats(),
        spelling: defaultStats(),
        quiz: defaultStats()
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
        { 
            type: 'vocabulary', 
            label: 'Học từ vựng', 
            icon: '📖', 
            accentColor: 'text-cyan-400',
            badgeBg: 'bg-cyan-500 text-black', 
            count: attempts.vocabulary?.count || 0, 
            totalTime: attempts.vocabulary?.totalTimeSeconds || 0,
            attemptsList: attempts.vocabulary?.attemptsList || []
        },
        { 
            type: 'matching', 
            label: 'Ghép cặp', 
            icon: '🧩', 
            accentColor: 'text-purple-400',
            badgeBg: 'bg-purple-500 text-white', 
            count: attempts.matching?.count || 0, 
            totalTime: attempts.matching?.totalTimeSeconds || 0,
            attemptsList: attempts.matching?.attemptsList || []
        },
        { 
            type: 'spelling', 
            label: 'Viết chính tả', 
            icon: '✏️', 
            accentColor: 'text-amber-400',
            badgeBg: 'bg-amber-500 text-black', 
            count: attempts.spelling?.count || 0, 
            totalTime: attempts.spelling?.totalTimeSeconds || 0,
            attemptsList: attempts.spelling?.attemptsList || []
        },
        { 
            type: 'quiz', 
            label: 'Trắc nghiệm', 
            icon: '📝', 
            accentColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-500 text-black', 
            count: attempts.quiz?.count || 0, 
            totalTime: attempts.quiz?.totalTimeSeconds || 0,
            attemptsList: attempts.quiz?.attemptsList || []
        },
    ];

    return (
        <div className="w-full bg-black border border-neutral-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl mb-4 text-white">
            <div className="flex flex-col items-center justify-center text-center gap-1.5 mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">📊</span>
                    <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wide">
                        LỊCH SỬ THAM GIA HỌC - {unitLabel}
                    </h3>
                </div>
                {playerData && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-neutral-900/90 px-3.5 py-1 rounded-full border border-amber-500/40 shadow-sm">
                        👤 {playerData.name} - Lớp {playerData.class}
                    </span>
                )}
            </div>

            <div className="border-b border-neutral-800 mb-3.5 w-full"></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {items.map((item) => {
                    const isActive = currentActivityType === item.type;
                    return (
                        <div
                            key={item.type}
                            className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                                isActive
                                    ? 'bg-neutral-900 border-2 border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.25)] ring-2 ring-yellow-400/40'
                                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 shadow-md'
                            }`}
                        >
                            <div className="w-full">
                                <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-neutral-800/80 w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg sm:text-xl">{item.icon}</span>
                                        <span className={`text-xs sm:text-sm font-black ${item.accentColor}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <span className="text-[10px] font-black text-black bg-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                                            ★ Đang tham gia ★
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between w-full mb-2.5 bg-black/60 px-3 py-1.5 rounded-xl border border-neutral-800">
                                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-tight">
                                        Số lần mở học:
                                    </span>
                                    <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shadow-sm ${
                                        isActive ? 'bg-yellow-400 text-black' : item.badgeBg
                                    }`}>
                                        {item.count}
                                    </span>
                                </div>

                                <div className="w-full text-left">
                                    <span className="text-[11px] font-bold text-amber-300/90 uppercase tracking-wide block mb-1.5">
                                        THỜI GIAN LÀM BÀI:
                                    </span>
                                    {item.attemptsList.length === 0 ? (
                                        <div className="text-xs italic text-neutral-500 px-1 py-1">Chưa có lượt học</div>
                                    ) : (
                                        /* NO scrollbars! Simple clean stacked list without scrollbars */
                                        <div className="flex flex-col gap-1 w-full text-xs">
                                            {item.attemptsList.map((att, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-medium bg-black/70 border border-neutral-800/90 text-neutral-200"
                                                >
                                                    <span className="font-bold text-neutral-400">Lần {idx + 1}:</span>
                                                    <span className="font-mono font-bold text-neutral-100">
                                                        {formatDuration(att.timeTakenSeconds)}{formatDateMonth(att.timestamp)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full mt-3.5 pt-2.5 border-t border-neutral-800 flex items-center justify-between px-3 py-2 rounded-xl bg-black/80 text-xs font-bold">
                                <span className="text-neutral-400">Tổng thời gian đã học:</span>
                                <span className="font-black font-mono text-sm text-yellow-400">
                                    {formatDuration(item.totalTime)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentAttemptSummaryBanner;
