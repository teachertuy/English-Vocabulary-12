// Live verification script for Fixed Student Positions in Teacher Dashboard

async function verifyLiveFixedPositions() {
    const baseRoster = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/loginRosterConfig.json";
    const resRoster = await fetch(baseRoster);
    const loginRosterConfig = await resRoster.json();

    const baseUnit1 = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12/unit_1/results.json";
    const resUnit1 = await fetch(baseUnit1);
    const unit1Data = await resUnit1.json();

    // Replicate getGroupedData
    const rawStudents = Object.entries(unit1Data || {}).map(([playerKey, resultsObj]) => {
        const resultsArray = resultsObj ? Object.entries(resultsObj).map(([id, r]) => ({ ...r, activityId: id })) : [];
        return { playerKey, playerName: resultsArray[0]?.playerName || "", playerClass: resultsArray[0]?.playerClass || "", results: resultsArray };
    });

    function getGroupedData(raw, currentClass) {
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

        const filtered = raw.filter(s => currentClass === 'all' || (s.playerClass || '').trim().normalize('NFC').toUpperCase() === (currentClass || '').trim().normalize('NFC').toUpperCase());

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
        });

        const groups = Object.values(mergedMap);

        return groups.sort((a, b) => {
            const classA = (a.playerClass || '').trim().normalize('NFC').toUpperCase();
            const classB = (b.playerClass || '').trim().normalize('NFC').toUpperCase();

            const classIdxA = classOrderMap.has(classA) ? classOrderMap.get(classA) : 999;
            const classIdxB = classOrderMap.has(classB) ? classOrderMap.get(classB) : 999;

            if (classIdxA !== classIdxB) return classIdxA - classIdxB;

            const posA = a.rosterPosition || 99999;
            const posB = b.rosterPosition || 99999;

            if (posA !== posB) return posA - posB;

            return a.playerName.localeCompare(b.playerName, 'vi');
        });
    }

    const grouped12A = getGroupedData(rawStudents, "12A");
    console.log("=== VERIFYING LIVE CLASS_220518 LỚP 12A UNIT 1 ===");
    console.log(`Total 12A Rows Displayed: ${grouped12A.length} (Expected: 39 configured students)`);

    let unsubmittedCount = 0;
    grouped12A.forEach(g => {
        if (g.attempts.length === 0) unsubmittedCount++;
    });

    console.log(`Submitted students: ${grouped12A.length - unsubmittedCount}, Unsubmitted (Chưa tham gia) students: ${unsubmittedCount}`);
    
    console.log("\nSample First 10 Rows for 12A:");
    grouped12A.slice(0, 10).forEach(g => {
        const status = g.attempts.length > 0 ? `${g.attempts.length} lượt` : "CHƯA THAM GIA";
        console.log(`  STT ${g.rosterPosition}: ${g.playerName} -> [${status}]`);
    });

    const isSequentialSTT = grouped12A.every((g, idx) => g.rosterPosition === idx + 1);
    console.log("\nStrict Sequential STT Check (STT 1 to 39 without gaps or skips):", isSequentialSTT ? "PASS" : "FAIL");
}

verifyLiveFixedPositions();
