// Upgrades stored chore data from older versions.
import { trackActivity } from './activity-log.js';
import { CURRENT_VERSION } from './constants.js';

export function migrateDataIfNeeded() {
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    if (!data || data && data.version === CURRENT_VERSION) {
        return;
    }

    let migratedData = data;

    if (data && data.version < CURRENT_VERSION) {
        console.log('Migrating data from version', data.version, 'to version', CURRENT_VERSION);
        migratedData = {
            ...data,
            version: CURRENT_VERSION,
            current: data.current ? {
                ...data.current,
                version: CURRENT_VERSION
            } : null,
            history: data.history ? data.history.reduce((acc, monthData) => {
                const previousMonthData = acc.find(item => item.month === monthData.month && item.year === monthData.year);
                if (!previousMonthData) {
                    acc.push({
                        ...monthData,
                        version: CURRENT_VERSION,
                    });
                } else {
                    previousMonthData.cells.forEach((cell, index) => {
                        cell.marks = cell.marks.map((mark, markIndex) => {
                            return mark || monthData.cells[index].marks[markIndex];
                        });
                    });
                }
                return acc;
            }, []) : [],
        };
    }

    if (migratedData.current !== null) {
        window.localStorage.setItem('choreMarksData', JSON.stringify(migratedData));
        trackActivity('Data Migration', { previousData: data, migratedData: migratedData, previousVersion: data.version, newVersion: CURRENT_VERSION });
    }
}
