// Content script to detect reset time from Claude usage settings page

(function() {
  'use strict';

  // Function to parse reset time from the page
  function detectResetTime() {
    // Look for text patterns that indicate reset time
    // Claude's usage page typically shows something like "Resets in X hours" or a specific time

    const pageText = document.body.innerText;

    // Common patterns to look for
    const patterns = [
      // "Resets in X hours Y minutes"
      /resets?\s+in\s+(\d+)\s*h(?:ours?)?\s*(?:and\s+)?(\d+)?\s*m(?:in(?:utes?)?)?/i,
      // "Resets in X hours"
      /resets?\s+in\s+(\d+)\s*h(?:ours?)?/i,
      // "Resets in X minutes"
      /resets?\s+in\s+(\d+)\s*m(?:in(?:utes?)?)?/i,
      // "Resets at HH:MM"
      /resets?\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      // "X hours until reset"
      /(\d+)\s*h(?:ours?)?\s*(?:and\s+)?(\d+)?\s*m(?:in(?:utes?)?)?\s*until\s+reset/i,
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        const resetTime = parseMatchToTime(match, pattern);
        if (resetTime) {
          return resetTime;
        }
      }
    }

    // Also try to find any element with reset-related classes or data attributes
    const resetElements = document.querySelectorAll('[class*="reset"], [data-reset], [class*="limit"]');
    for (const el of resetElements) {
      const text = el.textContent;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const resetTime = parseMatchToTime(match, pattern);
          if (resetTime) {
            return resetTime;
          }
        }
      }
    }

    return null;
  }

  function parseMatchToTime(match, pattern) {
    const now = new Date();

    // Check if it's a "Resets at HH:MM" pattern
    if (pattern.source.includes('at')) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }

      const resetTime = new Date(now);
      resetTime.setHours(hours, minutes, 0, 0);

      // If the time has passed today, it's tomorrow
      if (resetTime <= now) {
        resetTime.setDate(resetTime.getDate() + 1);
      }

      return resetTime.getTime();
    }

    // It's a duration pattern (X hours Y minutes)
    let totalMinutes = 0;

    if (match[1]) {
      // Check if this is hours or minutes based on context
      if (pattern.source.includes('hours') || pattern.source.match(/h(?:ours?)?/)) {
        totalMinutes += parseInt(match[1], 10) * 60;
        if (match[2]) {
          totalMinutes += parseInt(match[2], 10);
        }
      } else {
        totalMinutes += parseInt(match[1], 10);
      }
    }

    if (totalMinutes > 0) {
      return now.getTime() + (totalMinutes * 60 * 1000);
    }

    return null;
  }

  // Function to notify the extension
  function notifyExtension(resetTime) {
    chrome.runtime.sendMessage({
      action: 'resetTimeDetected',
      resetTime: resetTime
    });

    // Also store in local storage for the popup to read
    chrome.storage.local.set({
      detectedResetTime: resetTime,
      lastDetection: Date.now()
    });
  }

  // Run detection when page loads
  function init() {
    // Wait for page to fully load
    setTimeout(() => {
      const resetTime = detectResetTime();
      if (resetTime) {
        console.log('Claude Session Reminder: Detected reset time:', new Date(resetTime).toLocaleString());
        notifyExtension(resetTime);
      } else {
        console.log('Claude Session Reminder: Could not detect reset time automatically');
      }
    }, 2000);

    // Also set up a mutation observer to detect dynamic content
    const observer = new MutationObserver((mutations) => {
      const resetTime = detectResetTime();
      if (resetTime) {
        notifyExtension(resetTime);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
