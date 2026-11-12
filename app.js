const CURRENT_VERSION = 1.7;
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Order matches the columns of the chore table and each cell's marks array.
const personNames = ['Michael', 'Shocka', 'Brooke', 'Jacob', 'Duke'];
const RENT_INCREASE_AMOUNT = 100;
const RENT_INCREASE_MARK_THRESHOLD = 3;
let summaryController = null;

const currentDate = new Date();
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

migrateDataIfNeeded();
loadCurrentMonthData();
setupCellListeners();
setupHistoryButton();
setupSummaryButton();
setupFileButtons();

function migrateDataIfNeeded() {
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

function loadCurrentMonthData() {
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));

    // A restored history-only file has no current month, so start one.
    if (!data || !data.current || data.current.month !== currentMonth || data.current.year !== currentYear) {
        startNewMonth(data);
    } else {
        loadChoreMarks();
    }
}

function startNewMonth(data) {
    const initData = { month: currentMonth, year: currentYear, cells: [], version: CURRENT_VERSION };
    trackActivity('Start New Month', { month: currentMonth, year: currentYear });

    for (let day = 1; day <= 31; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getMonth() !== currentMonth) break;

        const row = document.createElement('tr');

        if (day === currentDate.getDate()) {
            row.classList.add('today');
        }

        const dateCell = document.createElement('th');
        dateCell.textContent = `${monthLabels[currentMonth]} ${day}, ${currentYear}`;
        dateCell.setAttribute('colspan', '2');
        dateCell.setAttribute('scope', 'row');
        row.appendChild(dateCell);

        const dayCell = document.createElement('td');
        dayCell.textContent = dayLabels[date.getDay()];
        row.appendChild(dayCell);

        for (let i = 0; i < 5; i++) {
            const personCell = document.createElement('td');
            personCell.textContent = '';
            personCell.classList.add('person-cell');
            row.appendChild(personCell);
        }

        document.querySelector('tbody').appendChild(row);

        initData.cells.push({
            date: `${monthLabels[currentMonth]} ${day}, ${currentYear}`,
            day: dayLabels[date.getDay()],
            marks: [false, false, false, false, false]
        });
    }

    const newHistoryData = data ? data.history : [];

    if (data && data.current) {
        newHistoryData.push(data.current);
        if (newHistoryData.length > 18) {
            newHistoryData.shift();
        }
    }

    window.localStorage.setItem('choreMarksData', JSON.stringify({ history: newHistoryData, current: initData, version: CURRENT_VERSION }));
}

function loadChoreMarks() {
    trackActivity('Load Chore Marks', { month: currentMonth, year: currentYear });

    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const tbody = document.querySelector('tbody');

    data.current.cells.forEach((cellData, index) => {
        const row = document.createElement('tr');

        if (index === currentDate.getDate() - 1) {
            row.classList.add('today');
        }

        const dateCell = document.createElement('th');
        dateCell.textContent = cellData.date;
        dateCell.setAttribute('scope', 'row');
        dateCell.setAttribute('colspan', '2');
        row.appendChild(dateCell);

        const dayCell = document.createElement('td');
        dayCell.textContent = cellData.day;
        row.appendChild(dayCell);

        cellData.marks.forEach((marked, choreIndex) => {
            const personCell = document.createElement('td');
            personCell.textContent = marked ? 'X' : '';
            personCell.classList.add('person-cell');

            if (marked) {
                personCell.classList.add('missed');
            }

            row.appendChild(personCell);
        });

        tbody.appendChild(row);
    });
}

function handleCellClick(event) {
    const cell = event.target;
    const index = Array.from(document.querySelectorAll('.person-cell')).indexOf(cell);
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const rowIndex = Math.floor(index / 5);
    const personIndex = index % 5;
    const marked = !data.current.cells[rowIndex].marks[personIndex];
    data.current.cells[rowIndex].marks[personIndex] = marked;
    cell.textContent = marked ? 'X' : '';
    if (marked) {
        cell.classList.add('missed');
    } else {
        cell.classList.remove('missed');
    }
    window.localStorage.setItem('choreMarksData', JSON.stringify(data));
    trackActivity('Update Chore Mark', { month: currentMonth, year: currentYear, cellIndex: index, marked: marked });
}

function setupCellListeners() {
    const cells = document.querySelectorAll('.person-cell');
    cells.forEach((cell, index) => {
        cell.addEventListener('click', handleCellClick);
    });
}

function setupHistoryButton() {
    const historyButton = document.getElementById('history');
    historyButton.addEventListener('click', handleHistory);
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    loadingDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 124 124" fill="none">
            <line id="loading-line1" x1="40" x2="80" y1="40" y2="80" stroke="#a20000" stroke-width="8">
                <animate attributeName="x2" from="40" to="80" dur="0.4s" />
                <animate attributeName="y2" from="40" to="80" dur="0.4s" />
            </line>
            <line id="loading-line2" x1="80" x2="40" y1="40" y2="80" stroke="#a20000" stroke-width="8" />
            <text fill="#000" font-size="10" x="40" y="116">Loading...</text>
        </svg>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
    document.querySelector('table').style.display = 'table';
}

function hideTable() {
    removeCellListeners();
    document.querySelector('table').style.display = 'none';
}

function removeCellListeners() {
    const cells = document.querySelectorAll('.person-cell');
    cells.forEach((cell) => {
        cell.removeEventListener('click', handleCellClick);
    });
}

function showTable() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    document.querySelector('table').style.display = 'table';
    loadCurrentMonthData();
    setupCellListeners();
}

function clearMarks() {
    trackActivity('Clear All Marks', { month: currentMonth, year: currentYear });
    if (confirm('Are you sure you want to clear all marks?')) {
        hideTable();
        showLoading();
        setTimeout(() => {
            const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
            data.current.cells.forEach(cell => {
                cell.marks = [false, false, false, false, false];
            });
            window.localStorage.setItem('choreMarksData', JSON.stringify(data));
            hideLoading();
            showTable();
        }, 1000);
    }
}

function resetTable() {
    trackActivity('Reset Data', { month: currentMonth, year: currentYear });
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    initializeChoreMarks();
    setupCellListeners();
}

function handleHistory(event) {
    trackActivity('View History');
    const isHistoryDisplayed = event && event.target && event.target.textContent === 'Hide History';

    const clearMarksButton = document.getElementById('clear-marks');
    clearMarksButton.disabled = isHistoryDisplayed ? false : true;

    if (isHistoryDisplayed) {
        removeHistoryView();
        event.target.textContent = 'View History';
        showTable();
        return;
    } else {
        const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
        if (!data.history || data.history.length === 0) {
            alert('No history available.');
            return;
        }

        // Only one view may be open at a time.
        removeFileView();
        removeSummaryView();
        event.target.textContent = 'Hide History';
        hideTable();
        renderHistory(data.history);
    }

}

function renderHistory(history, containerId = 'history-container', title = null, { subtitle = null } = {}) {
    const historyContainer = document.createElement('div');
    historyContainer.id = containerId;

    if (title) {
        const titleHeader = document.createElement('h2');
        titleHeader.textContent = title;
        historyContainer.appendChild(titleHeader);
    }

    if (subtitle) {
        const subtitleText = document.createElement('p');
        subtitleText.textContent = subtitle;
        historyContainer.appendChild(subtitleText);
    }

    history.forEach((monthData, monthIndex) => {
        const monthContainer = document.createElement('div');
        const monthHeader = document.createElement('h2');
        monthHeader.textContent = `${monthLabels[monthData.month] ?? monthData.month} ${monthData.year}`;
        monthContainer.appendChild(monthHeader);
        historyContainer.appendChild(monthContainer);

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Date', 'Day', 'Michael', 'Shocka', 'Brooke', 'Jacob', 'Duke'];
        headers.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;

            if (index === 0) {
                th.setAttribute('colspan', '2');
            }

            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        monthData.cells.forEach((cellData, cellIndex) => {
            const row = document.createElement('tr');

            const dateCell = document.createElement('th');
            dateCell.textContent = cellData.date;
            dateCell.setAttribute('scope', 'row');
            dateCell.setAttribute('colspan', '2');
            row.appendChild(dateCell);

            const dayCell = document.createElement('td');
            dayCell.textContent = cellData.day;
            row.appendChild(dayCell);

            cellData.marks.forEach((marked, choreIndex) => {
                const personCell = document.createElement('td');
                personCell.textContent = marked ? 'X' : '';
                personCell.classList.add('person-cell');

                if (marked) {
                    personCell.classList.add('missed');
                }

                row.appendChild(personCell);
            });

            table.appendChild(row);
        });
        historyContainer.appendChild(table);
    });

    document.body.appendChild(historyContainer);
}

function removeHistoryView() {
    const historyContainer = document.getElementById('history-container');
    if (historyContainer) {
        historyContainer.remove();
    }
    document.getElementById('history').textContent = 'View History';
}

function setupFileButtons() {
    document.getElementById('save-file').addEventListener('click', handleSaveToFile);
    document.getElementById('view-file').addEventListener('click', handleViewFile);
    document.getElementById('restore-file').addEventListener('click', handleRestoreFromFile);
}

// Opens the native file picker using a throwaway input. Its listeners are
// released through the AbortController whether the user picks a file or cancels.
function pickJsonFile(onFile) {
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

async function readSavedFile(file) {
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

function describeSavedFile({ current, history, version, exportedAt }) {
    const details = [];
    if (exportedAt) details.push(`Saved: ${new Date(exportedAt).toLocaleString()}`);
    if (version !== undefined) details.push(`Version: ${version}`);
    details.push(`Months: ${(current ? 1 : 0) + history.length}`);
    return details.join(' · ');
}

function handleRestoreFromFile() {
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

function handleSaveToFile() {
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

function handleViewFile(event) {
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
        removeHistoryView();
        removeSummaryView();
        const clearMarksButton = document.getElementById('clear-marks');
        clearMarksButton.disabled = true;
        hideTable();
        renderHistory(months, 'history-file-container', `File: ${file.name}`, { subtitle: describeSavedFile(contents) });
        button.textContent = 'Close File';
    });
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

function removeFileView() {
    const container = document.getElementById('history-file-container');
    if (container) {
        container.remove();
    }
    document.getElementById('view-file').textContent = 'View File';
}

function setupSummaryButton() {
    document.getElementById('summary').addEventListener('click', handleSummary);
}

function handleSummary(event) {
    const button = event.currentTarget;
    const clearMarksButton = document.getElementById('clear-marks');

    if (document.getElementById('summary-container')) {
        trackActivity('Hide Summary');
        removeSummaryView();
        clearMarksButton.disabled = false;
        showTable();
        return;
    }

    trackActivity('View Summary');
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const months = (data && Array.isArray(data.history) ? data.history : []).concat(data && data.current ? [data.current] : []);
    if (months.length === 0) {
        alert('No data available.');
        return;
    }

    // Only one view may be open at a time. Hiding the table detaches its cell
    // listeners; showTable() sets them up again when the summary is closed.
    removeHistoryView();
    removeFileView();
    clearMarksButton.disabled = true;
    hideTable();
    renderSummary(buildSummary(months));
    button.textContent = 'Hide Summary';
}

// Rent increases by RENT_INCREASE_AMOUNT in any month a person has at least
// RENT_INCREASE_MARK_THRESHOLD marks. It applies at most once per month.
function buildSummary(months) {
    const sortedMonths = months.slice().sort((a, b) => (b.year - a.year) || (b.month - a.month));

    const monthly = sortedMonths.map(monthData => {
        // One pass over the month: count each person's marks and record the marked
        // days as a bitmask (bit 0 = day 1). Cells are stored in day order.
        const counts = personNames.map(() => 0);
        const masks = personNames.map(() => 0);
        monthData.cells.forEach((cell, cellIndex) => {
            for (let personIndex = 0; personIndex < personNames.length; personIndex++) {
                if (cell.marks[personIndex]) {
                    counts[personIndex]++;
                    masks[personIndex] |= 1 << cellIndex;
                }
            }
        });

        return {
            label: monthLabel(monthData.month, monthData.year),
            month: monthData.month,
            year: monthData.year,
            people: personNames.map((name, personIndex) => ({
                name,
                marks: counts[personIndex],
                markedMask: masks[personIndex] >>> 0,
                rentIncreased: counts[personIndex] >= RENT_INCREASE_MARK_THRESHOLD,
            })),
        };
    });

    const cumulative = personNames.map((name, personIndex) => {
        const totalMarks = monthly.reduce((sum, month) => sum + month.people[personIndex].marks, 0);
        // Oldest first, so the increased months read in calendar order.
        const increasedMonths = monthly
            .filter(month => month.people[personIndex].rentIncreased)
            .map(month => ({ label: month.label, month: month.month, year: month.year, markedMask: month.people[personIndex].markedMask }))
            .reverse();
        return { name, totalMarks, totalIncrease: increasedMonths.length * RENT_INCREASE_AMOUNT, increasedMonths };
    });

    return { cumulative, monthly };
}

function renderSummary({ cumulative, monthly }) {
    const container = document.createElement('div');
    container.id = 'summary-container';

    // Every listener the summary adds is tied to this controller and released
    // in removeSummaryView().
    summaryController = new AbortController();
    const { signal } = summaryController;

    const cumulativeHeader = document.createElement('h2');
    cumulativeHeader.textContent = 'Cumulative';
    container.appendChild(cumulativeHeader);

    let hasCalendarMonths = false;

    cumulative.forEach((person, personIndex) => {
        const nameHeader = document.createElement('h3');
        nameHeader.textContent = person.name;
        const list = document.createElement('ul');
        [
            `Total marks: ${person.totalMarks}`,
            `Total rent increase: $${person.totalIncrease}`,
        ].forEach(text => {
            const item = document.createElement('li');
            item.textContent = text;
            list.appendChild(item);
        });

        const monthsItem = document.createElement('li');
        monthsItem.append('Months increased: ');
        if (person.increasedMonths.length === 0) {
            monthsItem.append('None');
        }
        person.increasedMonths.forEach((increasedMonth, index) => {
            if (index > 0) monthsItem.append(', ');
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'month-trigger';
            trigger.textContent = increasedMonth.label;
            trigger.setAttribute('aria-controls', 'summary-calendar');
            trigger.setAttribute('aria-expanded', 'false');
            // A compact copy of what the calendar needs, read back only when it is shown.
            trigger.dataset.calendar = encodeCalendarData(personIndex, increasedMonth);
            monthsItem.append(trigger);
            hasCalendarMonths = true;
        });
        list.appendChild(monthsItem);

        container.append(nameHeader, list);
    });

    // One calendar popover is shared by every month in the summary.
    if (hasCalendarMonths) {
        setupCalendarPopover(container, signal);
    }

    const monthlyHeader = document.createElement('h2');
    monthlyHeader.textContent = 'Month by Month';
    container.appendChild(monthlyHeader);

    monthly.forEach(month => {
        const monthHeader = document.createElement('h3');
        monthHeader.textContent = month.label;

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Person', 'Marks', 'Rent Increased'].forEach(text => {
            const th = document.createElement('th');
            th.setAttribute('scope', 'col');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        month.people.forEach(person => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('th');
            nameCell.setAttribute('scope', 'row');
            nameCell.textContent = person.name;
            const marksCell = document.createElement('td');
            marksCell.textContent = person.marks;
            const increasedCell = document.createElement('td');
            increasedCell.textContent = person.rentIncreased ? 'Y' : 'N';
            if (person.rentIncreased) {
                increasedCell.classList.add('missed');
            }
            row.append(nameCell, marksCell, increasedCell);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.append(monthHeader, table);
    });

    document.body.appendChild(container);
}

function monthLabel(month, year) {
    return `${monthLabels[month] ?? month} ${year}`;
}

// Calendar data stored on a month button as "person.year.month.mask",
// e.g. "0.2026.8.536887298". The mask's bit (day - 1) is set for each marked day.
function encodeCalendarData(personIndex, { year, month, markedMask }) {
    return `${personIndex}.${year}.${month}.${markedMask}`;
}

function decodeCalendarData(value) {
    const [personIndex, year, month, markedMask] = (value || '').split('.').map(Number);
    if (![personIndex, year, month, markedMask].every(Number.isInteger) || !personNames[personIndex]) {
        return null;
    }
    return { personName: personNames[personIndex], label: monthLabel(month, year), year, month, markedMask };
}

// Builds the calendar shown inside the shared popover for one person and month.
function buildCalendarContent(popover, { personName, label, month, year, markedMask }) {
    const header = document.createElement('div');
    header.className = 'calendar-header';
    const title = document.createElement('strong');
    title.textContent = `${personName} · ${label}`;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'calendar-close';
    closeButton.setAttribute('aria-label', 'Close calendar');
    closeButton.textContent = '×';
    // Native popover control: closes without needing a JS listener.
    closeButton.popoverTargetElement = popover;
    closeButton.popoverTargetAction = 'hide';
    header.append(title, closeButton);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    dayLabels.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-label';
        dayHeader.textContent = day;
        grid.appendChild(dayHeader);
    });

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstWeekday; i++) {
        grid.appendChild(document.createElement('div'));
    }
    let markedCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        if ((markedMask >>> (day - 1)) & 1) {
            markedCount++;
            dayCell.classList.add('missed');
            dayCell.setAttribute('aria-label', `${day}, marked`);
        }
        grid.appendChild(dayCell);
    }

    const footer = document.createElement('p');
    footer.className = 'calendar-footer';
    footer.textContent = `${markedCount} marked day${markedCount === 1 ? '' : 's'}`;

    popover.setAttribute('aria-label', `${personName} marks for ${label}`);
    popover.replaceChildren(header, grid, footer);
}

// One popover serves every month in the summary. Its content is built when a month
// is shown and removed when it closes. Mouse hover previews a month; a click (or
// tap) pins it open until it is closed with the close button, a click outside,
// Escape, or another click on the same month.
function setupCalendarPopover(container, signal) {
    const popover = document.createElement('div');
    popover.id = 'summary-calendar';
    popover.className = 'calendar-popover';
    // "auto" gives native light dismiss (click outside / Escape).
    popover.popover = 'auto';
    popover.setAttribute('role', 'dialog');
    container.appendChild(popover);

    let activeTrigger = null;
    let pinned = false;
    let hideTimer = null;
    let wasPinnedOpen = false;

    const isOpen = () => popover.matches(':popover-open');
    const triggerFrom = (event) => {
        const trigger = event.target.closest && event.target.closest('.month-trigger');
        return trigger && container.contains(trigger) && trigger.dataset.calendar ? trigger : null;
    };
    const cancelHide = () => {
        clearTimeout(hideTimer);
        hideTimer = null;
    };
    const show = (trigger) => {
        if (isOpen() && activeTrigger === trigger) return;
        const calendarData = decodeCalendarData(trigger.dataset.calendar);
        if (!calendarData) return;
        if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
        activeTrigger = trigger;
        trigger.setAttribute('aria-expanded', 'true');
        buildCalendarContent(popover, calendarData);
        if (!isOpen()) popover.showPopover();
        // Position right away; the toggle event fires after the first paint.
        positionPopover(popover, trigger);
    };
    const scheduleHide = () => {
        if (pinned) return;
        cancelHide();
        // A short delay lets the pointer travel from the month onto the calendar.
        hideTimer = setTimeout(() => {
            if (isOpen()) popover.hidePopover();
        }, 200);
    };

    // Delegated listeners: one set on the container covers every month.
    container.addEventListener('pointerover', (event) => {
        const trigger = triggerFrom(event);
        if (!trigger || event.pointerType !== 'mouse' || pinned) return;
        cancelHide();
        show(trigger);
    }, { signal });

    container.addEventListener('pointerout', (event) => {
        const trigger = triggerFrom(event);
        if (!trigger || event.pointerType !== 'mouse' || trigger.contains(event.relatedTarget)) return;
        scheduleHide();
    }, { signal });

    popover.addEventListener('pointerenter', cancelHide, { signal });
    popover.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse') scheduleHide();
    }, { signal });

    // Pressing a month counts as a click outside the popover, so light dismiss
    // closes it before the click handler runs. Remember whether it was pinned open.
    container.addEventListener('pointerdown', (event) => {
        const trigger = triggerFrom(event);
        if (trigger) wasPinnedOpen = pinned && isOpen() && activeTrigger === trigger;
    }, { signal });

    container.addEventListener('click', (event) => {
        const trigger = triggerFrom(event);
        if (!trigger) return;
        cancelHide();
        const closeIt = wasPinnedOpen || (pinned && isOpen() && activeTrigger === trigger);
        wasPinnedOpen = false;
        if (closeIt) {
            if (isOpen()) popover.hidePopover();
        } else {
            show(trigger);
            pinned = true;
        }
    }, { signal });

    popover.addEventListener('toggle', (event) => {
        if (event.newState === 'closed' && !isOpen()) {
            clearCalendar();
        }
    }, { signal });

    function clearCalendar() {
        cancelHide();
        pinned = false;
        if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
        activeTrigger = null;
        popover.replaceChildren();
        popover.removeAttribute('aria-label');
    }

    // Popovers are fixed to the viewport, so keep the open one next to its month on scroll/resize.
    const reposition = () => {
        if (isOpen() && activeTrigger) positionPopover(popover, activeTrigger);
    };
    window.addEventListener('scroll', reposition, { signal, passive: true });
    window.addEventListener('resize', reposition, { signal });

    // Make sure a pending hide does not fire after the summary is closed.
    signal.addEventListener('abort', cancelHide);
}

function positionPopover(popover, trigger) {
    const gap = 6;
    const margin = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = popover;

    const left = Math.min(Math.max(triggerRect.left, margin), window.innerWidth - width - margin);
    let top = triggerRect.bottom + gap;
    if (top + height > window.innerHeight - margin) {
        // Not enough room below: open above the month, or pin to the top on small screens.
        top = Math.max(triggerRect.top - height - gap, margin);
    }
    popover.style.left = `${Math.max(left, margin)}px`;
    popover.style.top = `${top}px`;
}

function removeSummaryView() {
    if (summaryController) {
        summaryController.abort();
        summaryController = null;
    }
    const container = document.getElementById('summary-container');
    if (container) {
        container.remove();
    }
    document.getElementById('summary').textContent = 'View Summary';
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

function trackActivity(activityName, activityData = null) {
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));
    const activityLog = window.localStorage.getItem('activityLog') ? JSON.parse(window.localStorage.getItem('activityLog')) : [];
    activityLog.push({ name: activityName, data: activityData, state: data, timestamp: new Date().toISOString() });

    if (activityLog.length > 100) {
        activityLog.shift();
    }

    window.localStorage.setItem('activityLog', JSON.stringify(activityLog));
}
