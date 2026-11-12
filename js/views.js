// Keeps the History, File and Summary views mutually exclusive.

const closers = new Map();

// Each view registers how to close itself so others can close it without importing it.
export function registerView(name, close) {
    closers.set(name, close);
}

// Only one view may be open at a time.
export function closeOtherViews(name) {
    closers.forEach((close, key) => {
        if (key !== name) close();
    });
}
