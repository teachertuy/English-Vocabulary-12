// Automated test suite for Fixed Student Positions in Teacher Dashboard

function simulateGetGroupedData(rawStudents, currentClass, loginRosterConfig) {
    const mergedMap = {};

    const classOrderMap = new Map();
    const studentOrderMap = new Map();

    if (loginRosterConfig && Array.isArray(loginRosterConfig.columns)) {
        loginRosterConfig.columns.forEach((col, colIdx) => {
            if (!col || !col.classId || col.classId.trim() === '') return;
            const normClass = col.classId.trim().normalize('NFC').toUpperCase();
            classOrderMap.set(normClass, colIdx);

            const isClassMatched = currentClass === 'all' || normClass === currentClass.trim().normalize('NFC').toUpperCase();

            if (col.studentList) {
                const rawNames = col.studentList.split(/[\n,;]/);
                let sIdx = 0;
                rawNames.forEach(rawName => {
                    const normName = rawName.trim().normalize('NFC').replace(/\s+/g, ' ');
                    if (normName.length > 0) {
                        const studentKey = `${normClass}_${normName.toUpperCase()}`;
                        if (!studentOrderMap.has(studentKey)) {
                            studentOrderMap.set(studentKey, sIdx);
                        }

                        if (isClassMatched) {
                            if (!mergedMap[studentKey]) {
                                mergedMap[studentKey] = {
                                    playerKey: studentKey,
                                    playerName: normName,
                                    playerClass: normClass,
                                    attempts: [],
                                    latestTimestamp: 0,
                                    rosterPosition: sIdx + 1
                                };
                            }
                        }
                        sIdx++;
                    }
                });
            }
        });
    }

    const filtered = rawStudents.filter(s => currentClass === 'all' || (s.playerClass || '').trim().normalize('NFC').toUpperCase() === (currentClass || '').trim().normalize('NFC').toUpperCase());

    filtered.forEach(s => {
        const pClass = (s.playerClass || '').trim().normalize('NFC').toUpperCase();
        const pName = (s.playerName || '').trim().normalize('NFC').replace(/\s+/g, ' ');
        const identityKey = `${pClass}_${pName.toUpperCase()}`;

        if (!mergedMap[identityKey]) {
            const studentIdx = studentOrderMap.has(identityKey) ? studentOrderMap.get(identityKey) + 1 : 99999;
            mergedMap[identityKey] = {
                playerKey: identityKey,
                playerName: pName,
                playerClass: pClass,
                attempts: [],
                latestTimestamp: 0,
                rosterPosition: studentIdx
            };
        }

        mergedMap[identityKey].attempts.push(...s.results);
        const groupLatest = s.results.length > 0 ? Math.max(...s.results.map(r => r.timestamp || 0)) : 0;
        if (groupLatest > mergedMap[identityKey].latestTimestamp) mergedMap[identityKey].latestTimestamp = groupLatest;
    });

    const groups = Object.values(mergedMap);
    groups.forEach(g => g.attempts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));

    return groups.sort((a, b) => {
        const classA = (a.playerClass || '').trim().normalize('NFC').toUpperCase();
        const classB = (b.playerClass || '').trim().normalize('NFC').toUpperCase();

        const classIdxA = classOrderMap.has(classA) ? classOrderMap.get(classA) : 999;
        const classIdxB = classOrderMap.has(classB) ? classOrderMap.get(classB) : 999;

        if (classIdxA !== classIdxB) {
            return classIdxA - classIdxB;
        }

        const posA = a.rosterPosition || 99999;
        const posB = b.rosterPosition || 99999;

        if (posA !== posB) {
            return posA - posB;
        }

        return a.playerName.localeCompare(b.playerName, 'vi');
    });
}

console.log("=== EXECUTING TEST FOR FIXED STUDENT POSITIONS ===");

const rosterConfig = {
    enabled: true,
    columns: [
        {
            classId: "12A",
            studentList: `Dương Quốc Anh
Nguyễn Huỳnh Bảo
Lê Thanh Bình
Nguyễn Văn Thanh Duy
Nguyễn Võ Minh Đương
Phạm Hoàng Hải`
        }
    ]
};

// Unit 1 results: Students 1, 2, 4, 5, 6 submitted attempts. Student #3 (Lê Thanh Bình) HAS NO RESULTS.
const unit1RawResults = [
    { playerName: "Dương Quốc Anh", playerClass: "12A", results: [{ gameType: "quiz", score: "9", timestamp: 1000 }] },
    { playerName: "Nguyễn Huỳnh Bảo", playerClass: "12A", results: [{ gameType: "vocabulary", score: "ĐÃ HỌC", timestamp: 2000 }] },
    { playerName: "Nguyễn Văn Thanh Duy", playerClass: "12A", results: [{ gameType: "matching", score: "10", timestamp: 3000 }] },
    { playerName: "Nguyễn Võ Minh Đương", playerClass: "12A", results: [{ gameType: "quiz", score: "10", timestamp: 4000 }] },
    { playerName: "Phạm Hoàng Hải", playerClass: "12A", results: [{ gameType: "spelling", score: "8.5", timestamp: 5000 }] }
];

const unit1Grouped = simulateGetGroupedData(unit1RawResults, "12A", rosterConfig);

console.log("\nUnit 1 Rendered Student List (6 total rows expected):");
unit1Grouped.forEach(g => {
    const status = g.attempts.length > 0 ? `${g.attempts.length} lượt làm` : "CHƯA THAM GIA";
    console.log(`  STT ${g.rosterPosition}: ${g.playerName} (${g.playerClass}) -> [${status}]`);
});

// Verification assertions
const passCount = unit1Grouped.length === 6;
const pass3 = unit1Grouped[2].playerName === "Lê Thanh Bình" && unit1Grouped[2].rosterPosition === 3 && unit1Grouped[2].attempts.length === 0;
const pass4 = unit1Grouped[3].playerName === "Nguyễn Văn Thanh Duy" && unit1Grouped[3].rosterPosition === 4 && unit1Grouped[3].attempts.length === 1;

console.log("\n--- TEST ASSERTIONS ---");
console.log("Total 6 rows present:", passCount ? "PASS" : "FAIL");
console.log("Position 3 reserved for Lê Thanh Bình (Chưa tham gia):", pass3 ? "PASS" : "FAIL");
console.log("Position 4 stays Nguyễn Văn Thanh Duy (NOT shifted to 3):", pass4 ? "PASS" : "FAIL");

if (passCount && pass3 && pass4) {
    console.log("\nALL FIXED POSITION TESTS PASSED SUCCESSFULLY!");
} else {
    console.error("\nTEST FAILURE DETECTED!");
}
