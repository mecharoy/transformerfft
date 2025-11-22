// Popup script for Claude Session Limit Reminder
// Works with both Chrome and Firefox

const browser = window.browser || window.chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const reminderMinutesInput = document.getElementById('reminder-minutes');
  const saveBtn = document.getElementById('save-btn');
  const fetchNowBtn = document.getElementById('fetch-now-btn');
  const statusText = document.getElementById('status-text');
  const countdownEl = document.getElementById('countdown');
  const resetTimeDisplay = document.getElementById('reset-time-display');
  const messageEl = document.getElementById('message');
  const lastFetchEl = document.getElementById('last-fetch');
  const fetchDot = document.getElementById('fetch-dot');

  // Load saved settings
  const data = await browser.storage.local.get(['reminderMinutes', 'resetTime', 'lastFetch']);

  if (data.reminderMinutes) {
    reminderMinutesInput.value = data.reminderMinutes;
  }

  // Update status immediately and start interval
  updateStatus();
  setInterval(updateStatus, 1000);

  // Save button handler
  saveBtn.addEventListener('click', async () => {
    const reminderMinutes = parseInt(reminderMinutesInput.value, 10);

    if (isNaN(reminderMinutes) || reminderMinutes < 1 || reminderMinutes > 180) {
      showMessage('Please enter a valid number (1-180)', 'error');
      return;
    }

    // Send to background script
    browser.runtime.sendMessage({
      action: 'setReminderMinutes',
      minutes: reminderMinutes
    });

    showMessage('Settings saved!', 'success');
  });

  // Fetch now button handler
  fetchNowBtn.addEventListener('click', async () => {
    fetchNowBtn.disabled = true;
    fetchNowBtn.textContent = 'Fetching...';

    try {
      await browser.runtime.sendMessage({ action: 'fetchNow' });
      showMessage('Fetched! Check if reset time updated.', 'success');
    } catch (e) {
      showMessage('Fetch failed. Are you logged into Claude?', 'error');
    }

    setTimeout(() => {
      fetchNowBtn.disabled = false;
      fetchNowBtn.textContent = 'Refresh Now';
      updateStatus();
    }, 1000);
  });

  async function updateStatus() {
    const data = await browser.storage.local.get(['resetTime', 'reminderMinutes', 'lastFetch']);

    // Update last fetch time
    if (data.lastFetch) {
      const ago = Math.round((Date.now() - data.lastFetch) / 60000);
      if (ago < 1) {
        lastFetchEl.textContent = 'Last checked: just now';
      } else if (ago === 1) {
        lastFetchEl.textContent = 'Last checked: 1 minute ago';
      } else {
        lastFetchEl.textContent = `Last checked: ${ago} minutes ago`;
      }
      fetchDot.classList.add('active');
    } else {
      lastFetchEl.textContent = 'Not fetched yet';
      fetchDot.classList.remove('active');
    }

    // Update countdown
    if (!data.resetTime) {
      statusText.textContent = 'Waiting for data...';
      statusText.className = 'status-value pending';
      countdownEl.textContent = '--:--:--';
      resetTimeDisplay.textContent = 'Visit claude.ai or wait for auto-fetch';
      return;
    }

    const now = Date.now();
    const resetTime = data.resetTime;
    const timeUntilReset = resetTime - now;

    if (timeUntilReset <= 0) {
      statusText.textContent = 'Limit should be reset!';
      statusText.className = 'status-value warning';
      countdownEl.textContent = '00:00:00';
      resetTimeDisplay.textContent = 'Your usage limit has reset';
      return;
    }

    const reminderMinutes = data.reminderMinutes || 30;
    const reminderTime = resetTime - (reminderMinutes * 60 * 1000);
    const timeUntilReminder = reminderTime - now;

    if (timeUntilReminder <= 0) {
      statusText.textContent = 'Use your remaining capacity!';
      statusText.className = 'status-value warning';
    } else {
      statusText.textContent = 'Reminder active';
      statusText.className = 'status-value active';
    }

    countdownEl.textContent = formatCountdown(timeUntilReset);
    resetTimeDisplay.textContent = `Resets at ${new Date(resetTime).toLocaleTimeString()}`;
  }

  function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function pad(num) {
    return num.toString().padStart(2, '0');
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;

    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
});
