// Popup script for Claude Session Limit Reminder
// Works with both Chrome and Firefox

const browser = window.browser || window.chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const reminderMinutesInput = document.getElementById('reminder-minutes');
  const saveBtn = document.getElementById('save-btn');
  const detectBtn = document.getElementById('detect-btn');
  const statusText = document.getElementById('status-text');
  const countdownEl = document.getElementById('countdown');
  const resetTimeDisplay = document.getElementById('reset-time-display');
  const messageEl = document.getElementById('message');

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

    await browser.storage.local.set({ reminderMinutes });

    // Update reminder alarm if we have a reset time
    const data = await browser.storage.local.get(['resetTime']);
    if (data.resetTime) {
      browser.runtime.sendMessage({
        action: 'setReminderMinutes',
        minutes: reminderMinutes
      });
    }

    showMessage('Settings saved!', 'success');
  });

  // Detect button handler - injects script into active tab
  detectBtn.addEventListener('click', async () => {
    detectBtn.disabled = true;
    detectBtn.textContent = 'Detecting...';

    try {
      // Get active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab || !tab.url || !tab.url.includes('claude.ai')) {
        showMessage('Please open claude.ai/settings/usage first!', 'error');
        detectBtn.disabled = false;
        detectBtn.textContent = 'Detect Reset Time from Page';
        return;
      }

      // Inject detection script
      const results = await browser.tabs.executeScript(tab.id, {
        code: `
          (function() {
            const text = document.body.innerText;

            // Try to match "Resets in X hr Y min"
            const match = text.match(/Resets\\s+in\\s+(\\d+)\\s*hr\\s+(\\d+)\\s*min/i);
            if (match) {
              const hours = parseInt(match[1], 10);
              const mins = parseInt(match[2], 10);
              const resetTime = Date.now() + (hours * 60 * 60 * 1000) + (mins * 60 * 1000);
              return { success: true, resetTime, matched: match[0] };
            }

            // Try "Resets in X hr"
            const hrMatch = text.match(/Resets\\s+in\\s+(\\d+)\\s*hr/i);
            if (hrMatch) {
              const hours = parseInt(hrMatch[1], 10);
              const resetTime = Date.now() + (hours * 60 * 60 * 1000);
              return { success: true, resetTime, matched: hrMatch[0] };
            }

            // Try "Resets in X min"
            const minMatch = text.match(/Resets\\s+in\\s+(\\d+)\\s*min/i);
            if (minMatch) {
              const mins = parseInt(minMatch[1], 10);
              const resetTime = Date.now() + (mins * 60 * 1000);
              return { success: true, resetTime, matched: minMatch[0] };
            }

            return { success: false, text: text.substring(0, 500) };
          })();
        `
      });

      const result = results[0];

      if (result && result.success) {
        // Save the reset time
        await browser.storage.local.set({
          resetTime: result.resetTime,
          lastFetch: Date.now()
        });

        // Set reminder alarm
        const settings = await browser.storage.local.get(['reminderMinutes']);
        const reminderMinutes = settings.reminderMinutes || 30;

        browser.runtime.sendMessage({
          action: 'resetTimeFromContent',
          resetTime: result.resetTime
        });

        showMessage('Detected: ' + result.matched, 'success');
        updateStatus();
      } else {
        showMessage('Could not find reset time. Make sure you are on the Usage page.', 'error');
        console.log('Page text sample:', result ? result.text : 'no result');
      }
    } catch (error) {
      console.error('Detection error:', error);
      showMessage('Error: ' + error.message, 'error');
    }

    detectBtn.disabled = false;
    detectBtn.textContent = 'Detect Reset Time from Page';
  });

  async function updateStatus() {
    const data = await browser.storage.local.get(['resetTime', 'reminderMinutes', 'lastFetch']);

    if (!data.resetTime) {
      statusText.textContent = 'No reset time set';
      statusText.className = 'status-value pending';
      countdownEl.textContent = '--:--:--';
      resetTimeDisplay.textContent = 'Click detect button after opening Claude usage page';
      return;
    }

    const now = Date.now();
    const resetTime = data.resetTime;
    const timeUntilReset = resetTime - now;

    if (timeUntilReset <= 0) {
      statusText.textContent = 'Limit should be reset!';
      statusText.className = 'status-value warning';
      countdownEl.textContent = '00:00:00';
      resetTimeDisplay.textContent = 'Your usage limit has reset - detect again';
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
    }, 4000);
  }
});
