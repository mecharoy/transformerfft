# Claude Session Limit Reminder

A Chrome/Edge browser extension that reminds you 30 minutes before your Claude usage limit resets, so you can maximize your productivity.

## Features

- **Auto-detect reset time**: Visit claude.ai/settings/usage to automatically detect your reset time
- **Manual setup**: Set your reset time manually if auto-detection doesn't work
- **Customizable reminder**: Set how many minutes before reset you want to be notified (default: 30 min)
- **Desktop notifications**: Get a persistent notification when it's time to use your remaining capacity
- **Live countdown**: See a real-time countdown to your limit reset

## Installation

### Chrome / Edge / Brave

1. Open your browser and go to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `claude-session-reminder` folder
5. The extension icon (clock) will appear in your toolbar

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file in the `claude-session-reminder` folder

## Usage

1. **Click the extension icon** in your toolbar to open the popup
2. **Set your reset time** either by:
   - Visiting [Claude Usage Settings](https://claude.ai/settings/usage) to auto-detect (the extension tries to parse the reset time from the page)
   - Manually entering the reset time using the date/time picker
3. **Set reminder time** (default is 30 minutes before reset)
4. **Click "Save & Set Reminder"**
5. **Get notified** when it's time to use your remaining Claude capacity!

## How It Works

- The extension stores your reset time locally in your browser
- A background service worker sets an alarm for X minutes before reset
- When the alarm fires, you get a desktop notification
- The popup shows a live countdown to your reset time

## Permissions

- `storage`: Save your settings locally
- `alarms`: Schedule the reminder notification
- `notifications`: Show desktop notifications
- `host_permissions (claude.ai)`: Auto-detect reset time from Claude settings page

## Privacy

This extension:
- Does NOT collect any personal data
- Does NOT send any data to external servers
- Only stores your reset time preference locally in your browser
- Only accesses claude.ai to detect reset times

## Troubleshooting

### Notifications not showing?
- Make sure notifications are enabled for your browser in your OS settings
- Check that the extension has notification permissions

### Auto-detection not working?
- Claude's page structure may have changed
- Use manual time entry as a fallback
- The extension logs detection attempts to the browser console

### Reset time wrong?
- Clear the current reminder and set a new one manually
- Make sure your timezone is correct in your system settings
