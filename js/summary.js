// View Summary: cumulative and month-by-month rent report.
import { trackActivity } from './activity-log.js';
import { encodeCalendarData, setupCalendarPopover } from './calendar-popover.js';
import { RENT_INCREASE_AMOUNT, RENT_INCREASE_MARK_THRESHOLD, monthLabel, personNames } from './constants.js';
import { hideTable, showTable } from './table.js';
import { closeOtherViews, registerView } from './views.js';

let summaryController = null;

export function setupSummaryButton() {
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
    closeOtherViews('summary');
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

registerView('summary', removeSummaryView);
