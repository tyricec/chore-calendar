// Entry point: runs migrations, draws the table and wires up the buttons.
import { slimActivityLogIfNeeded, trackActivity } from './activity-log.js';
import { handleViewFile } from './file-view.js';
import { setupHistoryButton } from './history-view.js';
import { migrateDataIfNeeded } from './migration.js';
import { handleRestoreFromFile } from './restore.js';
import { handleSaveToFile } from './saved-file.js';
import { setupSummaryButton } from './summary.js';
import { clearMarks, loadCurrentMonthData, setupCellListeners } from './table.js';

slimActivityLogIfNeeded();
migrateDataIfNeeded();
loadCurrentMonthData();
setupCellListeners();
setupHistoryButton();
setupSummaryButton();
setupButtons();

function setupButtons() {
    document.getElementById('clear-marks').addEventListener('click', clearMarks);
    document.getElementById('save-file').addEventListener('click', handleSaveToFile);
    document.getElementById('view-file').addEventListener('click', handleViewFile);
    document.getElementById('restore-file').addEventListener('click', handleRestoreFromFile);
    document.getElementById('reset-data').addEventListener('click', resetData);
    document.getElementById('refresh-page').addEventListener('click', refreshPage);
}

function resetData() {
    trackActivity('Reset Data');
    if (confirm('Are you sure you want to reset all data? This will clear all marks and history.')) {
        window.localStorage.removeItem('choreMarksData');
        location.reload();
    }
}

function refreshPage() {
    location.reload();
}
