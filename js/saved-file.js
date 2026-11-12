// Saving data to a file and reading saved files back.
import { trackActivity } from './activity-log.js';
import { CURRENT_VERSION } from './constants.js';

export function handleSaveToFile() {
    trackActivity('Save to File');
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const history = data && Array.isArray(data.history) ? data.history : [];
    const current = data && data.current ? data.current : null;
    if (!current && history.length === 0) {
        alert('No data available to save.');
        return;
    }

    const payload = { version: CURRENT_VERSION, exportedAt: new Date().toISOString(), current: current, history: history };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `chore-marks-${new Date().toISOString().slice(0, 10)}.json`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoke on the next task so the browser has started the download first.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Opens the native file picker using a throwaway input. Its listeners are
// released through the AbortController whether the user picks a file or cancels.
export function pickJsonFile(onFile) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    const controller = new AbortController();

    input.addEventListener('change', () => {
        controller.abort();
        const file = input.files && input.files[0];
        if (file) onFile(file);
    }, { signal: controller.signal });

    input.addEventListener('cancel', () => controller.abort(), { signal: controller.signal });

    input.click();
}

export async function readSavedFile(file) {
    try {
        const contents = parseSavedFile(await file.text());
        if (!contents.current && contents.history.length === 0) {
            alert('The selected file contains no data.');
            return null;
        }
        return contents;
    } catch (error) {
        alert(`Could not read file: ${error.message}`);
        return null;
    }
}

// Accepts files from Save to File ({ current, history }), older history-only
// saves ({ history }), or a bare array of months.
function parseSavedFile(text) {
    const parsed = JSON.parse(text);
    const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    const history = Array.isArray(parsed) ? parsed : isObject && parsed.history !== undefined ? parsed.history : [];
    const current = isObject && parsed.current ? parsed.current : null;

    if (!Array.isArray(history)) {
        throw new Error('History in file is not a list of months.');
    }
    if (isObject && parsed.history === undefined && !current) {
        throw new Error('No chore marks data found in file.');
    }

    const isValidMonth = (monthData) => monthData
        && Number.isInteger(monthData.month)
        && Number.isInteger(monthData.year)
        && Array.isArray(monthData.cells)
        && monthData.cells.every(cell => cell && Array.isArray(cell.marks));

    if ((current && !isValidMonth(current)) || !history.every(isValidMonth)) {
        throw new Error('File is not valid chore marks data.');
    }
    return { current, history, version: isObject ? parsed.version : undefined, exportedAt: isObject ? parsed.exportedAt : undefined };
}

export function describeSavedFile({ current, history, version, exportedAt }) {
    const details = [];
    if (exportedAt) details.push(`Saved: ${new Date(exportedAt).toLocaleString()}`);
    if (version !== undefined) details.push(`Version: ${version}`);
    details.push(`Months: ${(current ? 1 : 0) + history.length}`);
    return details.join(' · ');
}
