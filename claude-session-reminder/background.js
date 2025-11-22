// Background script for Claude Session Limit Reminder
// Works with both Chrome and Firefox

const browser = window.browser || window.chrome;

const REMINDER_ALARM = 'claudeSessionReminder';
const FETCH_ALARM = 'claudeFetchUsage';
const USAGE_URL = 'https://claude.ai/settings/usage';

// Default settings
const DEFAULT_REMINDER_MINUTES = 30;
const FETCH_INTERVAL_MINUTES = 5; // Check every 5 minutes

// Initialize on install
browser.runtime.onInstalled.addListener(() => {
  console.log('Claude Session Reminder installed');
  initializeExtension();
});

// Initialize on startup
browser.runtime.onStartup.addListener(() => {
  console.log('Claude Session Reminder started');
  initializeExtension();
});

async function initializeExtension() {
  // Set up periodic fetching
  browser.alarms.create(FETCH_ALARM, {
    delayInMinutes: 0.1, // Start almost immediately
    periodInMinutes: FETCH_INTERVAL_MINUTES
  });

  // Load any existing settings and restore reminder
  const data = await browser.storage.local.get(['resetTime', 'reminderMinutes']);
  if (data.resetTime && data.resetTime > Date.now()) {
    setReminderAlarm(data.resetTime, data.reminderMinutes || DEFAULT_REMINDER_MINUTES);
  }

  // Do initial fetch
  fetchUsageData();
}

// Listen for alarms
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMINDER_ALARM) {
    showNotification();
  } else if (alarm.name === FETCH_ALARM) {
    fetchUsageData();
  }
});

// Fetch usage data from Claude
async function fetchUsageData() {
  console.log('Fetching Claude usage data...');

  try {
    const response = await fetch(USAGE_URL, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      console.log('Failed to fetch usage page:', response.status);
      return;
    }

    const html = await response.text();
    const resetTime = parseResetTime(html);

    if (resetTime) {
      console.log('Detected reset time:', new Date(resetTime).toLocaleString());
      await updateResetTime(resetTime);
    } else {
      console.log('Could not parse reset time from page');
    }
  } catch (error) {
    console.error('Error fetching usage data:', error);
  }
}

// Parse reset time from HTML
function parseResetTime(html) {
  const now = Date.now();

  // Pattern 1: "Resets in 4 hr 27 min" - EXACT format from Claude
  const hrMinMatch = html.match(/Resets\s+in\s+(\d+)\s*hr\s+(\d+)\s*min/i);
  if (hrMinMatch) {
    const hours = parseInt(hrMinMatch[1], 10);
    const mins = parseInt(hrMinMatch[2], 10);
    return now + (hours * 60 * 60 * 1000) + (mins * 60 * 1000);
  }

  // Pattern 2: "Resets in X hr" (no minutes)
  const hrOnlyMatch = html.match(/Resets\s+in\s+(\d+)\s*hr(?!\s*\d)/i);
  if (hrOnlyMatch) {
    return now + parseInt(hrOnlyMatch[1], 10) * 60 * 60 * 1000;
  }

  // Pattern 3: "Resets in X min" (no hours)
  const minOnlyMatch = html.match(/Resets\s+in\s+(\d+)\s*min/i);
  if (minOnlyMatch) {
    return now + parseInt(minOnlyMatch[1], 10) * 60 * 1000;
  }

  // Pattern 4: "Resets in X hours Y minutes" (alternate format)
  const hoursMinMatch = html.match(/Resets\s+in\s+(\d+)\s*hours?\s*(?:and\s+)?(\d+)?\s*min(?:utes?)?/i);
  if (hoursMinMatch) {
    let totalMs = parseInt(hoursMinMatch[1], 10) * 60 * 60 * 1000;
    if (hoursMinMatch[2]) {
      totalMs += parseInt(hoursMinMatch[2], 10) * 60 * 1000;
    }
    return now + totalMs;
  }

  // Pattern 5: JSON data in the page
  const jsonMatch = html.match(/"resetsAt"\s*:\s*"([^"]+)"/i) ||
                    html.match(/"reset_at"\s*:\s*"([^"]+)"/i) ||
                    html.match(/"resetTime"\s*:\s*"([^"]+)"/i) ||
                    html.match(/"expiresAt"\s*:\s*"([^"]+)"/i);
  if (jsonMatch) {
    const resetDate = new Date(jsonMatch[1]);
    if (!isNaN(resetDate.getTime()) && resetDate.getTime() > now) {
      return resetDate.getTime();
    }
  }

  // Pattern 6: Unix timestamp in JSON
  const timestampMatch = html.match(/"(?:resetsAt|reset_at|resetTime|expiresAt)"\s*:\s*(\d{10,13})/i);
  if (timestampMatch) {
    let timestamp = parseInt(timestampMatch[1], 10);
    if (timestamp < 10000000000) timestamp *= 1000;
    if (timestamp > now) return timestamp;
  }

  return null;
}

// Update reset time and set reminder
async function updateResetTime(resetTime) {
  const data = await browser.storage.local.get(['reminderMinutes', 'resetTime']);
  const reminderMinutes = data.reminderMinutes || DEFAULT_REMINDER_MINUTES;

  // Only update if this is a new/different reset time (within 1 minute tolerance)
  const oldResetTime = data.resetTime || 0;
  const timeDiff = Math.abs(resetTime - oldResetTime);

  if (timeDiff > 60000) { // More than 1 minute difference
    await browser.storage.local.set({
      resetTime,
      lastFetch: Date.now()
    });

    setReminderAlarm(resetTime, reminderMinutes);
  }
}

// Set the reminder alarm
async function setReminderAlarm(resetTime, reminderMinutes) {
  // Clear existing reminder
  await browser.alarms.clear(REMINDER_ALARM);

  const reminderTime = resetTime - (reminderMinutes * 60 * 1000);
  const now = Date.now();

  if (reminderTime > now) {
    browser.alarms.create(REMINDER_ALARM, {
      when: reminderTime
    });
    console.log(`Reminder set for ${new Date(reminderTime).toLocaleString()}`);
  } else if (resetTime > now) {
    // Reminder time passed but reset hasn't - notify now
    showNotification();
  }
}

// Show notification
async function showNotification() {
  const data = await browser.storage.local.get(['resetTime', 'reminderMinutes']);
  const resetTime = data.resetTime;
  const reminderMinutes = data.reminderMinutes || DEFAULT_REMINDER_MINUTES;

  let message = `Your Claude usage limit resets in ~${reminderMinutes} minutes! Use your remaining capacity now.`;

  if (resetTime) {
    const resetDate = new Date(resetTime);
    const minsLeft = Math.round((resetTime - Date.now()) / 60000);
    message = `Your Claude usage limit resets at ${resetDate.toLocaleTimeString()} (~${minsLeft} min). Use your remaining capacity!`;
  }

  browser.notifications.create('claude-reminder', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '⏰ Claude Limit Resetting Soon!',
    message: message
  });
}

// Listen for messages from popup/content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchNow') {
    fetchUsageData().then(() => sendResponse({ success: true }));
    return true;
  } else if (message.action === 'setReminderMinutes') {
    browser.storage.local.set({ reminderMinutes: message.minutes }).then(() => {
      browser.storage.local.get(['resetTime']).then(data => {
        if (data.resetTime) {
          setReminderAlarm(data.resetTime, message.minutes);
        }
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (message.action === 'clearReminder') {
    browser.alarms.clear(REMINDER_ALARM);
    browser.storage.local.remove(['resetTime']).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'resetTimeFromContent') {
    // Content script detected reset time
    updateResetTime(message.resetTime);
    sendResponse({ success: true });
    return true;
  }
});

// Make sure alarms are set up on load
initializeExtension();
