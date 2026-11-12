// The current month's chore table and its cell listeners.
import { trackActivity } from './activity-log.js';
import { CURRENT_VERSION, currentDate, currentMonth, currentYear, dayLabels, monthLabels } from './constants.js';

// `trackLoad` is false when a view closes and the table is simply redrawn, so that
// only page loads are logged as "Load Chore Marks".
export function loadCurrentMonthData(trackLoad = true) {
    const data = JSON.parse(window.localStorage.getItem('choreMarksData'));

    // A restored history-only file has no current month, so start one.
    if (!data || !data.current || data.current.month !== currentMonth || data.current.year !== currentYear) {
        startNewMonth(data);
    } else {
        loadChoreMarks(trackLoad);
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

function loadChoreMarks(trackLoad = true) {
    if (trackLoad) {
        trackActivity('Load Chore Marks', { month: currentMonth, year: currentYear });
    }

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

export function setupCellListeners() {
    const cells = document.querySelectorAll('.person-cell');
    cells.forEach((cell, index) => {
        cell.addEventListener('click', handleCellClick);
    });
}

function removeCellListeners() {
    const cells = document.querySelectorAll('.person-cell');
    cells.forEach((cell) => {
        cell.removeEventListener('click', handleCellClick);
    });
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

export function hideTable() {
    removeCellListeners();
    document.querySelector('table').style.display = 'none';
}

export function showTable() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    document.querySelector('table').style.display = 'table';
    loadCurrentMonthData(false);
    setupCellListeners();
}

export function clearMarks() {
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
