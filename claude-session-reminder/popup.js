document.addEventListener('DOMContentLoaded', async () => {
  const resetTimeInput = document.getElementById('reset-time');
  const reminderMinutesInput = document.getElementById('reminder-minutes');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusText = document.getElementById('status-text');
  const countdownEl = document.getElementById('countdown');
  const messageEl = document.getElementById('message');

  // Load saved settings
  const data = await chrome.storage.local.get(['resetTime', 'reminderMinutes']);

  if (data.resetTime) {
    const resetDate = new Date(data.resetTime);
    resetTimeInput.value = formatDateTimeLocal(resetDate);
  }

  if (data.reminderMinutes) {
    reminderMinutesInput.value = data.reminderMinutes;
  }

  // Update status
  updateStatus();

  // Start countdown timer
  setInterval(updateStatus, 1000);

  // Save button handler
  saveBtn.addEventListener('click', async () => {
    const resetTimeValue = resetTimeInput.value;
    const reminderMinutes = parseInt(reminderMinutesInput.value, 10);

    if (!resetTimeValue) {
      showMessage('Please set a reset time', 'error');
      return;
    }

    if (isNaN(reminderMinutes) || reminderMinutes < 1) {
      showMessage('Please enter valid reminder minutes', 'error');
      return;
    }

    const resetTime = new Date(resetTimeValue).getTime();

    if (resetTime <= Date.now()) {
      showMessage('Reset time must be in the future', 'error');
      return;
    }

    // Save to storage
    await chrome.storage.local.set({
      resetTime,
      reminderMinutes
    });

    // Set alarm in background
    chrome.runtime.sendMessage({
      action: 'setReminder',
      resetTime,
      reminderMinutes
    });

    showMessage('Reminder set successfully!', 'success');
    updateStatus();
  });

  // Clear button handler
  clearBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['resetTime', 'reminderMinutes']);
    chrome.runtime.sendMessage({ action: 'clearReminder' });

    resetTimeInput.value = '';
    reminderMinutesInput.value = '30';

    showMessage('Reminder cleared', 'success');
    updateStatus();
  });

  async function updateStatus() {
    const data = await chrome.storage.local.get(['resetTime', 'reminderMinutes']);

    if (!data.resetTime) {
      statusText.textContent = 'No reminder set';
      statusText.className = 'inactive';
      countdownEl.textContent = '';
      return;
    }

    const now = Date.now();
    const resetTime = data.resetTime;
    const timeUntilReset = resetTime - now;

    if (timeUntilReset <= 0) {
      statusText.textContent = 'Reset time passed!';
      statusText.className = 'warning';
      countdownEl.textContent = 'Limit should be reset now';
      return;
    }

    const reminderTime = resetTime - (data.reminderMinutes * 60 * 1000);
    const timeUntilReminder = reminderTime - now;

    if (timeUntilReminder <= 0) {
      statusText.textContent = 'Reminder triggered!';
      statusText.className = 'warning';
    } else {
      statusText.textContent = 'Reminder active';
      statusText.className = 'active';
    }

    countdownEl.textContent = formatCountdown(timeUntilReset);
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

  function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;

    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'resetTimeDetected') {
    const resetTimeInput = document.getElementById('reset-time');
    const resetDate = new Date(message.resetTime);
    resetTimeInput.value = formatDateTimeLocalGlobal(resetDate);

    const messageEl = document.getElementById('message');
    messageEl.textContent = 'Reset time detected from Claude page!';
    messageEl.className = 'message success';

    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
});

function formatDateTimeLocalGlobal(date) {
  const pad = (num) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
