// View History: renders stored history months.
import { trackActivity } from './activity-log.js';
import { monthLabels } from './constants.js';
import { hideTable, showTable } from './table.js';
import { closeOtherViews, registerView } from './views.js';

export function setupHistoryButton() {
    const historyButton = document.getElementById('history');
    historyButton.addEventListener('click', handleHistory);
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
        closeOtherViews('history');
        event.target.textContent = 'Hide History';
        hideTable();
        renderHistory(data.history);
    }

}

export function renderHistory(history, containerId = 'history-container', title = null, { subtitle = null } = {}) {
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

registerView('history', removeHistoryView);
