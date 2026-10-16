/**
 * Batch repair tool for historical zero-time student activity attempts.
 * Backs up all original data before making any changes.
 * Only updates timeTakenSeconds and completion status for verified active attempts.
 */
const fs = require('fs');
const path = require('path');

function decodePushId(id) {
    if (!id || typeof id !== 'string' || id.length < 8) return null;
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    let time = 0;
    for (let i = 0; i < 8; i++) {
        const idx = PUSH_CHARS.indexOf(id.charAt(i));
        if (idx === -1) return null;
        time = time * 64 + idx;
    }
    if (time < 1700000000000 || time > 1900000000000) return null;
    return time;
}

async function repairAllGrade12Units(dryRun = false) {
    const backupDir = path.join(__dirname, '../.aistudio/backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const unitsUrl = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12.json";
    console.log("Fetching units_12 data from Firebase...");
    const res = await fetch(unitsUrl);
    const units = await res.json();
    if (!units) {
        console.log("No units found.");
        return;
    }

    // Save full backup of units_12 results before any update
    const backupFile = path.join(backupDir, `backup_units_12_results_${Date.now()}.json`);
    const resultsOnlyBackup = {};
    Object.entries(units).forEach(([unitKey, unitVal]) => {
        if (unitVal?.results) {
            resultsOnlyBackup[unitKey] = unitVal.results;
        }
    });
    fs.writeFileSync(backupFile, JSON.stringify(resultsOnlyBackup, null, 2));
    console.log(`[BACKUP] Saved backup of all units_12 results to: ${backupFile}`);

    let totalChecked = 0;
    let totalZeroTimeWithActivity = 0;
    let totalRepaired = 0;
    const repairLog = [];

    for (const [unitKey, unitVal] of Object.entries(units)) {
        const results = unitVal?.results;
        if (!results) continue;

        for (const [studentKey, attemptsObj] of Object.entries(results)) {
            if (!attemptsObj) continue;

            for (const [actId, act] of Object.entries(attemptsObj)) {
                totalChecked++;
                const recordedTime = parseInt(act.timeTakenSeconds, 10) || 0;
                const hasActivity = (act.audioListenedCount > 0) || 
                                    (act.uniqueWordsListenedCount > 0) || 
                                    (act.answered > 0) || 
                                    (act.correct > 0) || 
                                    (act.incorrect > 0);

                if (recordedTime === 0 && hasActivity) {
                    totalZeroTimeWithActivity++;
                    const startTime = decodePushId(actId);
                    const endTime = typeof act.timestamp === 'number' 
                        ? act.timestamp 
                        : (act.timestamp?.seconds ? act.timestamp.seconds * 1000 : null);

                    if (startTime && endTime && endTime >= startTime) {
                        const rawSec = Math.round((endTime - startTime) / 1000);
                        const clampedSec = Math.min(7200, Math.max(10, rawSec));

                        const patchPayload = {
                            timeTakenSeconds: clampedSec
                        };

                        if (act.gameType === 'vocabulary' && act.uniqueWordsListenedCount >= (act.totalQuestions || 30)) {
                            patchPayload.score = 'ĐÃ HỌC';
                            patchPayload.status = 'completed';
                        }

                        repairLog.push({
                            unit: unitKey,
                            student: studentKey,
                            actId,
                            gameType: act.gameType,
                            oldTime: 0,
                            newTime: clampedSec,
                            payload: patchPayload
                        });

                        if (!dryRun) {
                            const patchUrl = `https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12/${unitKey}/results/${encodeURIComponent(studentKey)}/${actId}.json`;
                            try {
                                await fetch(patchUrl, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(patchPayload)
                                });
                                totalRepaired++;
                            } catch (err) {
                                console.error(`Error patching ${unitKey}/${studentKey}/${actId}:`, err);
                            }
                        }
                    }
                }
            }
        }
    }

    console.log(`\n=== AUDIT SUMMARY ===`);
    console.log(`Mode: ${dryRun ? "DRY RUN (Preview only)" : "REAL EXECUTION"}`);
    console.log(`Total attempts checked: ${totalChecked}`);
    console.log(`Zero-time attempts with active learning: ${totalZeroTimeWithActivity}`);
    console.log(`Attempts queued/repaired: ${dryRun ? repairLog.length : totalRepaired}`);
    console.log(`Backup file: ${backupFile}`);

    return {
        totalChecked,
        totalZeroTimeWithActivity,
        totalRepaired: dryRun ? repairLog.length : totalRepaired,
        repairLog
    };
}

const isExecute = process.argv.includes('--execute');
repairAllGrade12Units(!isExecute);
