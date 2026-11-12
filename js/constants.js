// Shared constants and today's date.

export const CURRENT_VERSION = 1.7;
export const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Order matches the columns of the chore table and each cell's marks array.
export const personNames = ['Michael', 'Shocka', 'Brooke', 'Jacob', 'Duke'];
export const RENT_INCREASE_AMOUNT = 100;
export const RENT_INCREASE_MARK_THRESHOLD = 3;
export const ACTIVITY_LOG_LIMIT = 100;

export const currentDate = new Date();
export const currentMonth = currentDate.getMonth();
export const currentYear = currentDate.getFullYear();

export function monthLabel(month, year) {
    return `${monthLabels[month] ?? month} ${year}`;
}
