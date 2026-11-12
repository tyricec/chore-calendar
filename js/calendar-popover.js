// The shared calendar popover used by the summary.
import { dayLabels, monthLabel, personNames } from './constants.js';

// Calendar data stored on a month button as "person.year.month.mask",
// e.g. "0.2026.8.536887298". The mask's bit (day - 1) is set for each marked day.
export function encodeCalendarData(personIndex, { year, month, markedMask }) {
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
export function setupCalendarPopover(container, signal) {
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
