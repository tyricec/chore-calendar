// Debug activity log kept in localStorage.
import { ACTIVITY_LOG_LIMIT, CURRENT_VERSION } from './constants.js';

function readActivityLog() {
    try {
        const activityLog = JSON.parse(window.localStorage.getItem('activityLog'));
        return Array.isArray(activityLog) ? activityLog : [];
    } catch (error) {
        return [];
    }
}

// Entries no longer carry a full copy of the data ("state"); that made the log
// ~4MB and every action re-read and re-wrote all of it. Events that change the
// data wholesale (Data Migration, Restore From File Applied) still record the
// before/after data in their own `data` field.
export function trackActivity(activityName, activityData = null) {
    const activityLog = readActivityLog();
    activityLog.push({ name: activityName, data: activityData, version: CURRENT_VERSION, timestamp: new Date().toISOString() });
    saveActivityLog(activityLog.slice(-ACTIVITY_LOG_LIMIT));
}

// Logging must never stop the action being logged. If storage is full, drop the
// oldest half of the log and try again before giving up.
function saveActivityLog(activityLog) {
    let entries = activityLog;
    while (entries.length > 0) {
        try {
            window.localStorage.setItem('activityLog', JSON.stringify(entries));
            return;
        } catch (error) {
            console.warn('Activity log could not be saved; trimming it.', error);
            entries = entries.slice(Math.ceil(entries.length / 2));
        }
    }
    window.localStorage.removeItem('activityLog');
}


// Migration for activity logs written before entries were slimmed down: removes
// the full-data "state" copy from every entry and keeps everything else (name,
// data, timestamp). It runs on page load and does nothing once the log is slim.
export function slimActivityLogIfNeeded() {
    const rawLog = window.localStorage.getItem('activityLog');
    const activityLog = readActivityLog();
    if (!activityLog.some(entry => entry && typeof entry === 'object' && 'state' in entry)) {
        return;
    }

    const slimmedLog = activityLog
        .filter(entry => entry && typeof entry === 'object')
        .map(({ state, ...entry }) => entry)
        .slice(-ACTIVITY_LOG_LIMIT);
    saveActivityLog(slimmedLog);

    console.log('Migrated activity log: removed full data copies from', activityLog.length, 'entries');
    trackActivity('Activity Log Migration', {
        entries: slimmedLog.length,
        previousSizeKB: Math.round(rawLog.length / 1024),
        newSizeKB: Math.round((window.localStorage.getItem('activityLog') || '').length / 1024),
    });
}
