// Standalone simulation script for the proposed formula: P_cuoi = min(P_tam, T, 99)

async function runSimulation() {
    const base = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12.json";
    const res = await fetch(base);
    const data = await res.json();
    if (!data) return;

    function calculateDetails(attemptsList, unitVocabCount = 77, unitQuizCount = 40) {
        if (!attemptsList || attemptsList.length === 0) return { overallPercent: 0, is100: false, timeSec: 0, C: 0, T: 0 };

        const valid = attemptsList.filter(a => a && (
            (a.timeTakenSeconds && a.timeTakenSeconds > 0) ||
            (a.answered && a.answered > 0) ||
            (a.correct && a.correct > 0) ||
            (a.incorrect && a.incorrect > 0) ||
            (a.uniqueWordsListenedCount && a.uniqueWordsListenedCount > 0) ||
            (a.audioListenedCount && a.audioListenedCount > 0)
        ));

        if (valid.length === 0) return { overallPercent: 0, is100: false, timeSec: 0, C: 0, T: 0 };

        let timeSec = 0;
        valid.forEach(a => timeSec += (a.timeTakenSeconds || 0));

        let card1MaxUnique = 0;
        let card2MaxAns = 0, card2SumAns = 0, card2SumCorr = 0;
        let card3MaxAns = 0, card3SumAns = 0, card3SumCorr = 0;
        let card4MaxAns = 0, card4SumAns = 0, card4SumCorr = 0;
        let card5MaxAns = 0, card5SumAns = 0, card5SumCorr = 0;

        const c1Words = new Set();

        valid.forEach(a => {
            const gt = (a.gameType === 'listen-choose' || a.gameType === 'listenChoose') ? 'listenChoose' : a.gameType;
            const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct, 10) || 0);
            const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect, 10) || 0);
            const ans = typeof a.answered === 'number' ? a.answered : (corr + incorr);

            if (gt === 'vocabulary') {
                const u = a.uniqueWordsListenedCount || (Array.isArray(a.listenedWords) ? a.listenedWords.length : 0);
                if (u > card1MaxUnique) card1MaxUnique = u;
                if (Array.isArray(a.listenedWords)) a.listenedWords.forEach(w => c1Words.add(w));
            } else if (gt === 'matching') {
                if (ans > card2MaxAns) card2MaxAns = ans;
                card2SumAns += ans; card2SumCorr += corr;
            } else if (gt === 'listenChoose') {
                if (ans > card3MaxAns) card3MaxAns = ans;
                card3SumAns += ans; card3SumCorr += corr;
            } else if (gt === 'spelling') {
                if (ans > card4MaxAns) card4MaxAns = ans;
                card4SumAns += ans; card4SumCorr += corr;
            } else if (gt === 'quiz') {
                if (ans > card5MaxAns) card5MaxAns = ans;
                card5SumAns += ans; card5SumCorr += corr;
            }
        });

        const card1Cov = (Math.max(c1Words.size, card1MaxUnique) / unitVocabCount) * 100;
        const card2Cov = (Math.min(unitVocabCount, Math.max(card2MaxAns, Math.min(unitVocabCount, card2SumAns))) / unitVocabCount) * 100;
        const card3Cov = (Math.min(unitVocabCount, Math.max(card3MaxAns, Math.min(unitVocabCount, card3SumAns))) / unitVocabCount) * 100;
        const card4Cov = (Math.min(unitVocabCount, Math.max(card4MaxAns, Math.min(unitVocabCount, card4SumAns))) / unitVocabCount) * 100;
        const card5Cov = (Math.min(unitQuizCount, Math.max(card5MaxAns, Math.min(unitQuizCount, card5SumAns))) / unitQuizCount) * 100;

        const card2Acc = card2SumAns > 0 ? (card2SumCorr / card2SumAns) * 100 : 0;
        const card3Acc = card3SumAns > 0 ? (card3SumCorr / card3SumAns) * 100 : 0;
        const card4Acc = card4SumAns > 0 ? (card4SumCorr / card4SumAns) * 100 : 0;
        const card5Acc = card5SumAns > 0 ? (card5SumCorr / card5SumAns) * 100 : 0;

        const cond1 = timeSec >= 9000;
        const cond2 = card1Cov >= 99.99 && card2Cov >= 99.99 && card3Cov >= 99.99 && card4Cov >= 99.99 && card5Cov >= 99.99;
        const cond3 = (card2SumAns > 0 && card2Acc > 50) && (card3SumAns > 0 && card3Acc > 50) && (card4SumAns > 0 && card4Acc > 50) && (card5SumAns > 0 && card5Acc > 50);

        const is100 = cond1 && cond2 && cond3;

        const C = (card1Cov + card2Cov + card3Cov + card4Cov + card5Cov) / 5;
        const T = Math.min(100, (timeSec / 9000) * 100);

        const rawP = 0.7 * C + 0.3 * T;
        const P_tam = is100 ? 100 : Math.min(99, Math.round(rawP));

        // Proposed formula: P_cuoi = is100 ? 100 : min(Math.round(rawP), Math.floor(T), 99)
        const P_proposed = is100 ? 100 : Math.min(Math.round(rawP), Math.floor(T), 99);

        return { P_tam, P_proposed, is100, timeSec, C, T };
    }

    console.log("================ SIMULATION SUMMARY FOR CLASS_220518 ================");

    for (const [unitId, unitObj] of Object.entries(data)) {
        if (!unitObj || !unitObj.results) continue;

        const grouped = {};
        Object.entries(unitObj.results).forEach(([playerKey, resultsObj]) => {
            const arr = resultsObj ? Object.entries(resultsObj).map(([id, item]) => ({ ...item, _actId: id })) : [];
            if (arr.length === 0) return;
            const pName = (arr[0].playerName || "").trim().normalize("NFC").replace(/\s+/g, " ");
            const pClass = (arr[0].playerClass || "").trim().normalize("NFC").toUpperCase();
            const normKey = `${pClass}_${pName.toUpperCase()}`;
            if (!grouped[normKey]) grouped[normKey] = { name: pName, className: pClass, attempts: [] };
            grouped[normKey].attempts.push(...arr);
        });

        console.log(`\n--- UNIT: ${unitId.toUpperCase()} (Total Students: ${Object.keys(grouped).length}) ---`);

        let totalStudents = Object.keys(grouped).length;
        let count100 = 0;
        let countCappedByTime = 0;
        let diffList = [];

        Object.entries(grouped).forEach(([key, stud]) => {
            const res = calculateDetails(stud.attempts);
            if (res.is100) count100++;
            if (res.P_proposed < res.P_tam) {
                countCappedByTime++;
                diffList.push({
                    name: stud.name,
                    pClass: stud.className,
                    timeMin: (res.timeSec / 60).toFixed(1),
                    C: res.C.toFixed(1),
                    T: res.T.toFixed(1),
                    P_tam: res.P_tam,
                    P_proposed: res.P_proposed
                });
            }
        });

        console.log(`  100% Eligible Students: ${count100}`);
        console.log(`  Students whose score drops because P > T: ${countCappedByTime} / ${totalStudents}`);
        
        if (diffList.length > 0) {
            console.log("  Top 5 Impacted Students Sample:");
            diffList.slice(0, 5).forEach(d => {
                console.log(`    - ${d.pClass} ${d.name}: Time ${d.timeMin}m (T=${d.T}%), C=${d.C}% -> Score Old: ${d.P_tam}% => New: ${d.P_proposed}%`);
            });
        }
    }
}
runSimulation();
