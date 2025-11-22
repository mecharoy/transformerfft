const browser = window.browser || window.chrome;

const countdown = document.getElementById('countdown');
const status = document.getElementById('status');
const minutesInput = document.getElementById('minutes');
const saveBtn = document.getElementById('save');

// Load settings
browser.storage.local.get(['reminderMinutes']).then(data => {
  if (data.reminderMinutes) minutesInput.value = data.reminderMinutes;
});

// Save button
saveBtn.onclick = () => {
  const mins = parseInt(minutesInput.value, 10);
  if (mins >= 1 && mins <= 180) {
    browser.storage.local.set({ reminderMinutes: mins });
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1500);
  }
};

// Update display
function update() {
  browser.storage.local.get(['resetTime', 'detectedText']).then(data => {
    if (!data.resetTime) {
      countdown.textContent = '--:--:--';
      status.textContent = 'Visit claude.ai/settings/usage';
      status.className = 'status';
      return;
    }

    const now = Date.now();
    const remaining = data.resetTime - now;

    if (remaining <= 0) {
      countdown.textContent = '00:00:00';
      status.textContent = 'Limit has reset!';
      status.className = 'status warning';
      return;
    }

    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);

    countdown.textContent =
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' +
      String(s).padStart(2, '0');

    status.textContent = data.detectedText || 'Detected';
    status.className = 'status detected';
  });
}

update();
setInterval(update, 1000);
