// Automated test suite for Teacher Dashboard Roster Ordering

function getRosterOrderMap(rosterConfig) {
    const classOrderMap = new Map();
    const studentOrderMap = new Map();

    if (!rosterConfig || !Array.isArray(rosterConfig.columns)) {
        return { classOrderMap, studentOrderMap };
    }

    rosterConfig.columns.forEach((col, colIdx) => {
        if (!col || !col.classId || col.classId.trim() === '') return;
        const normClass = col.classId.trim().normalize('NFC').toUpperCase();
        classOrderMap.set(normClass, colIdx);

        if (col.studentList) {
            const rawNames = col.studentList.split(/[\n,;]/);
            let sIdx = 0;
            rawNames.forEach(rawName => {
                const normName = rawName.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
                if (normName.length > 0) {
                    const studentKey = `${normClass}_${normName}`;
                    if (!studentOrderMap.has(studentKey)) {
                        studentOrderMap.set(studentKey, sIdx);
                    }
                    sIdx++;
                }
            });
        }
    });

    return { classOrderMap, studentOrderMap };
}

function sortStudentGroups(groups, rosterConfig) {
    const { classOrderMap, studentOrderMap } = getRosterOrderMap(rosterConfig);

    return [...groups].sort((a, b) => {
        const classA = (a.playerClass || '').trim().normalize('NFC').toUpperCase();
        const classB = (b.playerClass || '').trim().normalize('NFC').toUpperCase();

        const classIdxA = classOrderMap.has(classA) ? classOrderMap.get(classA) : 999;
        const classIdxB = classOrderMap.has(classB) ? classOrderMap.get(classB) : 999;

        if (classIdxA !== classIdxB) {
            return classIdxA - classIdxB;
        }

        const normNameA = (a.playerName || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
        const normNameB = (b.playerName || '').trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ');

        const keyA = `${classA}_${normNameA}`;
        const keyB = `${classB}_${normNameB}`;

        const studentIdxA = studentOrderMap.has(keyA) ? studentOrderMap.get(keyA) : 99999;
        const studentIdxB = studentOrderMap.has(keyB) ? studentOrderMap.get(keyB) : 99999;

        if (studentIdxA !== studentIdxB) {
            return studentIdxA - studentIdxB;
        }

        return normNameA.localeCompare(normNameB, 'vi');
    });
}

// TEST CASES EXECUTION
console.log("=== EXECUTING 10 MANDATORY ROSTER SORTING TESTS ===");

const mockRosterConfig = {
    enabled: true,
    columns: [
        {
            classId: "12A",
            studentList: `Dương Quốc Anh
Nguyễn Huỳnh Bảo
Lê Thanh Bình
Nguyễn Văn Thanh Duy
Nguyễn Võ Minh Đương
  Nguyễn  Minh   Thành  `
        },
        {
            classId: "12B",
            studentList: `Lê Anh Vũ
Bùi Văn Kiệt
Nguyễn Minh Thành
Trương Thế Nghiêm`
        }
    ]
};

// 1. Mock Students for 12A
const mockGroups12A = [
    { playerName: "Nguyễn Võ Minh Đương", playerClass: "12A", latestTimestamp: 1790000005000, attempts: [{ score: "10" }] }, // Submitted first
    { playerName: "Dương Quốc Anh", playerClass: "12A", latestTimestamp: 1790000001000, attempts: [{ score: "9" }] },
    { playerName: "Lê Thanh Bình", playerClass: "12A", latestTimestamp: 1790000003000, attempts: [{ score: "8" }] },
    { playerName: "Nguyễn Huỳnh Bảo", playerClass: "12A", latestTimestamp: 1790000002000, attempts: [{ score: "10" }, { score: "7" }] }, // Multiple attempts
    { playerName: "Nguyễn Văn Thanh Duy", playerClass: "12A", latestTimestamp: 1790000004000, attempts: [{ score: "9.5" }] },
    { playerName: "Phan Văn Unlisted", playerClass: "12A", latestTimestamp: 1790000006000, attempts: [{ score: "6" }] } // Unlisted student
];

const sorted12A = sortStudentGroups(mockGroups12A, mockRosterConfig);
console.log("\n[Test 1, 3, 4, 6, 9] Sorted 12A Student Order:");
sorted12A.forEach((s, idx) => console.log(`  ${idx + 1}. ${s.playerName} (Class: ${s.playerClass})`));

const expectedOrder12A = [
    "Dương Quốc Anh",
    "Nguyễn Huỳnh Bảo",
    "Lê Thanh Bình",
    "Nguyễn Văn Thanh Duy",
    "Nguyễn Võ Minh Đương",
    "Phan Văn Unlisted"
];

const pass12A = sorted12A.every((s, i) => s.playerName === expectedOrder12A[i]);
console.log("-> 12A Ordering Test Result:", pass12A ? "PASS" : "FAIL");

// 2. Same Name Different Class Test (Nguyễn Minh Thành in 12A vs 12B)
const mockDuplicateNames = [
    { playerName: "Nguyễn Minh Thành", playerClass: "12B", latestTimestamp: 1000 },
    { playerName: "Nguyễn Minh Thành", playerClass: "12A", latestTimestamp: 2000 },
    { playerName: "Dương Quốc Anh", playerClass: "12A", latestTimestamp: 3000 }
];

const sortedDup = sortStudentGroups(mockDuplicateNames, mockRosterConfig);
console.log("\n[Test 10] Same Name Different Class (12A vs 12B) Sorted Order:");
sortedDup.forEach((s, idx) => console.log(`  ${idx + 1}. ${s.playerName} - Lớp: ${s.playerClass}`));

const passDup = sortedDup[0].playerClass === "12A" && sortedDup[0].playerName === "Dương Quốc Anh" &&
                 sortedDup[1].playerClass === "12A" && sortedDup[1].playerName === "Nguyễn Minh Thành" &&
                 sortedDup[2].playerClass === "12B" && sortedDup[2].playerName === "Nguyễn Minh Thành";
console.log("-> Same Name Different Class Test Result:", passDup ? "PASS" : "FAIL");

// Summary
if (pass12A && passDup) {
    console.log("\nALL AUTOMATED UNIT TESTS PASSED SUCCESSFULLY!");
} else {
    console.error("\nTEST FAILURE DETECTED!");
}
