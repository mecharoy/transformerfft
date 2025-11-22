# Claude Session Limit Reminder

A Firefox/Chrome browser extension that **automatically** reminds you 30 minutes before your Claude usage limit resets, so you can maximize your productivity.

## Features

- **Automatic detection**: Fetches reset time from Claude every 5 minutes
- **Works in background**: No need to manually set anything
- **Content script detection**: Also detects reset time when browsing claude.ai
- **Customizable reminder**: Set how many minutes before reset you want notification
- **Desktop notifications**: Get a persistent notification when it's time
- **Live countdown**: See real-time countdown to your limit reset

## Installation

### Firefox (Recommended)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to the `claude-session-reminder` folder and select `manifest.json`
4. The extension icon (clock) will appear in your toolbar

**For permanent installation:**
1. Go to `about:addons`
2. Click the gear icon → **Install Add-on From File**
3. Select a zipped version of the extension folder

### Chrome / Edge / Brave

1. Open your browser and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `claude-session-reminder` folder

## How It Works

1. **Auto-fetch**: The extension fetches `claude.ai/settings/usage` every 5 minutes using your logged-in session
2. **Parse reset time**: It looks for patterns like "Resets in X hours" in the page content
3. **Set reminder**: An alarm is set for 30 minutes (configurable) before reset
4. **Notify**: You get a desktop notification when it's time to use your remaining capacity

## Usage

1. **Install the extension** (see above)
2. **Make sure you're logged into Claude** at claude.ai
3. **That's it!** The extension will automatically detect your reset time
4. Click the extension icon to see:
   - Current countdown to reset
   - Last fetch time
   - Option to manually refresh
   - Settings to change reminder timing

## Settings

- **Reminder minutes**: How many minutes before reset to notify you (default: 30)
- **Refresh Now**: Manually trigger a fetch if needed

## Permissions

- `storage`: Save settings locally
- `alarms`: Schedule reminder notifications and periodic fetching
- `notifications`: Show desktop notifications
- `https://claude.ai/*`: Fetch usage page and detect reset time

## Privacy

This extension:
- Does NOT collect any personal data
- Does NOT send data to external servers
- Only communicates with claude.ai using your existing session
- All data is stored locally in your browser

## Troubleshooting

### Not detecting reset time?
- Make sure you're logged into claude.ai
- Try clicking "Refresh Now" in the popup
- Visit claude.ai/settings/usage manually to trigger content script
- Check the browser console for error messages

### Notifications not showing?
- Ensure notifications are enabled for your browser in OS settings
- Firefox: Check `about:preferences#privacy` → Permissions → Notifications

### Firefox temporary add-on disappears?
- Temporary add-ons are removed when Firefox closes
- For permanent installation, package as .xpi file or use about:addons

## Technical Details

- Uses Manifest V2 for better Firefox compatibility
- Background script runs periodically via alarms API
- Content script observes DOM changes on claude.ai
- Supports both `browser` (Firefox) and `chrome` APIs
