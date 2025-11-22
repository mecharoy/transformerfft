// Background service worker for Claude Session Limit Reminder

const ALARM_NAME = 'claudeSessionReminder';

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    showNotification();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setReminder') {
    setReminder(message.resetTime, message.reminderMinutes);
    sendResponse({ success: true });
  } else if (message.action === 'clearReminder') {
    clearReminder();
    sendResponse({ success: true });
  } else if (message.action === 'resetTimeDetected') {
    // Store detected reset time
    chrome.storage.local.set({
      detectedResetTime: message.resetTime,
      lastDetection: Date.now()
    });
  }
  return true;
});

// Set reminder alarm
async function setReminder(resetTime, reminderMinutes) {
  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  // Calculate when to trigger reminder (X minutes before reset)
  const reminderTime = resetTime - (reminderMinutes * 60 * 1000);

  if (reminderTime > Date.now()) {
    // Set the alarm
    chrome.alarms.create(ALARM_NAME, {
      when: reminderTime
    });

    console.log(`Reminder set for ${new Date(reminderTime).toLocaleString()}`);
    console.log(`Reset time: ${new Date(resetTime).toLocaleString()}`);
  } else {
    // If reminder time has passed but reset hasn't, notify immediately
    if (resetTime > Date.now()) {
      showNotification();
    }
  }
}

// Clear reminder alarm
async function clearReminder() {
  await chrome.alarms.clear(ALARM_NAME);
  console.log('Reminder cleared');
}

// Show notification
function showNotification() {
  chrome.storage.local.get(['resetTime', 'reminderMinutes'], (data) => {
    const resetTime = data.resetTime;
    const reminderMinutes = data.reminderMinutes || 30;

    let message = `Your Claude usage limit resets in ${reminderMinutes} minutes! Use your remaining capacity now.`;

    if (resetTime) {
      const resetDate = new Date(resetTime);
      message = `Your Claude usage limit resets at ${resetDate.toLocaleTimeString()}! Use your remaining capacity now.`;
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '⏰ Claude Session Reminder',
      message: message,
      priority: 2,
      requireInteraction: true
    });
  });
}

// On install/update, check if there's an existing reminder to restore
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['resetTime', 'reminderMinutes']);

  if (data.resetTime && data.resetTime > Date.now()) {
    setReminder(data.resetTime, data.reminderMinutes || 30);
  }
});

// On startup, restore alarms
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['resetTime', 'reminderMinutes']);

  if (data.resetTime && data.resetTime > Date.now()) {
    setReminder(data.resetTime, data.reminderMinutes || 30);
  }
});
