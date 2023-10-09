let clientSession = new Date();

let clientSessionTimer = setInterval(() => {
  const now = new Date;
  const secondsSpan = (now - clientSession) / 1000;

  if (secondsSpan > 15) {
    postMessage('wakeup'); // Send a message wakeup to the worker page
    clearInterval(clientSessionTimer); // Clear the timer
  } else {
    clientSession = now; // Update the clientSession timer variable
    postMessage('update'); // And post a message to the page ONLY IF needed
  }
}, 1000);