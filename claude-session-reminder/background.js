// Background script - handles alarms and notifications
const browser = window.browser || window.chrome;

const ALARM_NAME = 'claudeReminder';
const CHECK_ALARM = 'claudeCheck';

// Check storage periodically and set reminder alarm
async function checkAndSetAlarm() {
  const data = await browser.storage.local.get(['resetTime', 'reminderMinutes']);

  if (!data.resetTime) return;

  const reminderMinutes = data.reminderMinutes || 30;
  const reminderTime = data.resetTime - (reminderMinutes * 60 * 1000);
  const now = Date.now();

  if (reminderTime > now) {
    browser.alarms.create(ALARM_NAME, { when: reminderTime });
    console.log('Reminder alarm set for:', new Date(reminderTime).toLocaleString());
  } else if (data.resetTime > now) {
    // Already past reminder time but before reset
    showNotification(data.resetTime);
  }
}

// Show notification
async function showNotification(resetTime) {
  const resetDate = new Date(resetTime);
  const minsLeft = Math.max(0, Math.round((resetTime - Date.now()) / 60000));

  browser.notifications.create('claude-reminder', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Claude Limit Resetting Soon!',
    message: `Resets at ${resetDate.toLocaleTimeString()} (~${minsLeft} min). Use remaining capacity!`
  });
}

// Listen for alarms
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    browser.storage.local.get(['resetTime']).then(data => {
      if (data.resetTime) showNotification(data.resetTime);
    });
  } else if (alarm.name === CHECK_ALARM) {
    checkAndSetAlarm();
  }
});

// Listen for storage changes (when content script updates resetTime)
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.resetTime) {
    console.log('Reset time updated:', new Date(changes.resetTime.newValue).toLocaleString());
    checkAndSetAlarm();
  }
});

// Initialize
browser.alarms.create(CHECK_ALARM, { periodInMinutes: 1 });
checkAndSetAlarm();
console.log('Claude Reminder background loaded');
