// Live verification script for Teacher Dashboard Student Ordering

async function testLiveDashboardOrdering() {
    const baseRoster = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/loginRosterConfig.json";
    const resRoster = await fetch(baseRoster);
    const rosterConfig = await resRoster.json();

    console.log("=== LIVE ROSTER CONFIGURATION LOADED FROM FIREBASE ===");
    console.log("Enabled:", rosterConfig ? rosterConfig.enabled : false);
    if (rosterConfig && rosterConfig.columns) {
        rosterConfig.columns.forEach((col, idx) => {
            if (col.classId) {
                const names = col.studentList ? col.studentList.split(/[\n,;]/).map(s => s.trim()).filter(s => s.length > 0) : [];
                console.log(`Column ${idx + 1} [Lớp ${col.classId}]: ${names.length} học sinh`);
                console.log("  Top 5 configured students:", names.slice(0, 5));
            }
        });
    }

    const baseUnit2 = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12/unit_2/results.json";
    const resUnit2 = await fetch(baseUnit2);
    const unit2Data = await resUnit2.json();

    if (!unit2Data) return;

    // Build raw StudentUnitSummary array
    const rawStudents = Object.entries(unit2Data).map(([playerKey, resultsObj]) => {
        const resultsArray = resultsObj ? Object.entries(resultsObj).map(([id, r]) => ({ ...r, activityId: id })) : [];
        return { playerKey, playerName: resultsArray[0]?.playerName || "", playerClass: resultsArray[0]?.playerClass || "", results: resultsArray };
    });

    // Merge NFD and NFC keys first
    const mergedMap = {};
    rawStudents.forEach(s => {
        const pClass = (s.playerClass || '').trim().normalize('NFC').toUpperCase();
        const pName = (s.playerName || '').trim().normalize('NFC').replace(/\s+/g, ' ');
        const identityKey = `${pClass}_${pName.toUpperCase()}`;
        if (!mergedMap[identityKey]) {
            mergedMap[identityKey] = { playerKey: identityKey, playerName: pName, playerClass: pClass, attempts: [], latestTimestamp: 0 };
        }
        mergedMap[identityKey].attempts.push(...s.results);
    });

    const groups = Object.values(mergedMap);

    // Apply the exact sorting algorithm from TeacherDashboard.tsx
    const classOrderMap = new Map();
    const studentOrderMap = new Map();

    if (rosterConfig && Array.isArray(rosterConfig.columns)) {
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
    }

    const sortedGroups = groups.sort((a, b) => {
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

    console.log("\n=== VERIFIED DASHBOARD ORDER FOR LIVE CLASS_220518 UNIT 2 ===");
    console.log(`Total Merged Students Displayed: ${sortedGroups.length}`);

    // Print 12A students
    console.log("\n--- LỚP 12A (Top 10) ---");
    const students12A = sortedGroups.filter(g => g.playerClass === "12A");
    students12A.slice(0, 10).forEach((s, idx) => {
        const key = `12A_${s.playerName.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ')}`;
        const cfgIdx = studentOrderMap.get(key);
        console.log(`  STT ${idx + 1}: ${s.playerName} (Roster Position: ${cfgIdx !== undefined ? cfgIdx + 1 : "Unlisted"})`);
    });

    // Print 12B students
    console.log("\n--- LỚP 12B (Top 10) ---");
    const students12B = sortedGroups.filter(g => g.playerClass === "12B");
    students12B.slice(0, 10).forEach((s, idx) => {
        const key = `12B_${s.playerName.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' ')}`;
        const cfgIdx = studentOrderMap.get(key);
        console.log(`  STT ${idx + 1}: ${s.playerName} (Roster Position: ${cfgIdx !== undefined ? cfgIdx + 1 : "Unlisted"})`);
    });
}

testLiveDashboardOrdering();
