window.addEventListener('error', function (event) {
    console.error('Error occurred: ', event.error);
    localStorage.setItem('lastError', JSON.stringify({ message: event.error.message, stack: event.error.stack, data: JSON.parse(localStorage.getItem('choreMarksData')) }));
    event.preventDefault();
});
