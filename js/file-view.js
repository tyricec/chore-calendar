// View File: shows the contents of a saved file.
import { trackActivity } from './activity-log.js';
import { renderHistory } from './history-view.js';
import { describeSavedFile, pickJsonFile, readSavedFile } from './saved-file.js';
import { hideTable, showTable } from './table.js';
import { closeOtherViews, registerView } from './views.js';

export function handleViewFile(event) {
    if (document.getElementById('history-file-container')) {
        trackActivity('Close File');
        removeFileView();
        showTable();
        const clearMarksButton = document.getElementById('clear-marks');
        clearMarksButton.disabled = false;
        return;
    }

    trackActivity('View File');
    const button = event.currentTarget;

    pickJsonFile(async (file) => {
        const contents = await readSavedFile(file);
        if (!contents) return;

        // Show the file's latest month first, then the rest from newest to oldest.
        const months = (contents.current ? [contents.current] : []).concat(contents.history.slice().reverse());

        // Close the other views if open, and detach the table's
        // cell listeners so their indexes are not thrown off by the file's cells.
        closeOtherViews('file');
        const clearMarksButton = document.getElementById('clear-marks');
        clearMarksButton.disabled = true;
        hideTable();
        renderHistory(months, 'history-file-container', `File: ${file.name}`, { subtitle: describeSavedFile(contents) });
        button.textContent = 'Close File';
    });
}

function removeFileView() {
    const container = document.getElementById('history-file-container');
    if (container) {
        container.remove();
    }
    document.getElementById('view-file').textContent = 'View File';
}

registerView('file', removeFileView);
