// Restore From File, with a backup prompt before overwriting.
import { trackActivity } from './activity-log.js';
import { CURRENT_VERSION } from './constants.js';
import { describeSavedFile, handleSaveToFile, pickJsonFile, readSavedFile } from './saved-file.js';

export function handleRestoreFromFile() {
    trackActivity('Restore From File');
    pickJsonFile(async (file) => {
        const contents = await readSavedFile(file);
        if (contents) {
            showRestoreDialog(file.name, contents);
        }
    });
}

function showRestoreDialog(fileName, contents) {
    const storedData = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const hasStoredData = !!(storedData && (storedData.current || (storedData.history && storedData.history.length > 0)));

    const dialog = document.createElement('dialog');
    const heading = document.createElement('h2');
    heading.textContent = 'Restore From File';
    const warning = document.createElement('p');
    warning.textContent = `Restoring from "${fileName}" will overwrite your current marks and history. Any data not saved to a file may be lost. Save a backup of your current data first if you may need it.`;
    const details = document.createElement('p');
    details.textContent = describeSavedFile(contents);

    const backupButton = document.createElement('button');
    backupButton.textContent = 'Save Backup';
    backupButton.disabled = !hasStoredData;
    const restoreButton = document.createElement('button');
    restoreButton.textContent = 'Restore';
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';

    dialog.append(heading, warning, details, backupButton, restoreButton, cancelButton);

    // Every listener is tied to this controller and released when the dialog
    // closes, whether by Restore, Cancel, or the Escape key.
    const controller = new AbortController();
    const { signal } = controller;

    backupButton.addEventListener('click', () => {
        handleSaveToFile();
        backupButton.textContent = 'Backup Saved';
        backupButton.disabled = true;
    }, { signal });

    restoreButton.addEventListener('click', () => {
        dialog.close();
        restoreData(fileName, contents);
    }, { signal });

    cancelButton.addEventListener('click', () => dialog.close(), { signal });

    dialog.addEventListener('close', () => {
        controller.abort();
        dialog.remove();
    }, { signal });

    document.body.appendChild(dialog);
    dialog.showModal();
}

function restoreData(fileName, { current, history, version }) {
    const previousData = JSON.parse(window.localStorage.getItem('choreMarksData'));
    // Keep the file's version so the normal load runs any migrations from it.
    const restoredVersion = version ?? (current || history[0] || {}).version ?? CURRENT_VERSION;
    const restoredData = { version: restoredVersion, current: current, history: history };

    trackActivity('Restore From File Applied', { fileName: fileName, previousData: previousData, restoredData: restoredData });
    window.localStorage.setItem('choreMarksData', JSON.stringify(restoredData));
    location.reload();
}
