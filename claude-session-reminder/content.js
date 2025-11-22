// Content script for Claude Session Limit Reminder
// Runs on claude.ai pages to detect reset time

(function() {
  'use strict';

  const browser = window.browser || window.chrome;

  // Function to parse reset time from visible page content
  function detectResetTime() {
    const pageText = document.body.innerText;
    const now = Date.now();

    // Patterns to look for - ordered by specificity
    const patterns = [
      // "Resets in 4 hr 27 min" - EXACT format from Claude
      {
        regex: /Resets\s+in\s+(\d+)\s*hr\s+(\d+)\s*min/i,
        parse: (m) => {
          const hours = parseInt(m[1], 10);
          const mins = parseInt(m[2], 10);
          return now + (hours * 60 * 60 * 1000) + (mins * 60 * 1000);
        }
      },
      // "Resets in 4 hr" (no minutes)
      {
        regex: /Resets\s+in\s+(\d+)\s*hr(?!\s*\d)/i,
        parse: (m) => now + parseInt(m[1], 10) * 60 * 60 * 1000
      },
      // "Resets in 27 min" (no hours)
      {
        regex: /Resets\s+in\s+(\d+)\s*min/i,
        parse: (m) => now + parseInt(m[1], 10) * 60 * 1000
      },
      // "Resets in X hours Y minutes" (alternate format)
      {
        regex: /Resets\s+in\s+(\d+)\s*hours?\s*(?:and\s+)?(\d+)?\s*min(?:utes?)?/i,
        parse: (m) => {
          let ms = parseInt(m[1], 10) * 60 * 60 * 1000;
          if (m[2]) ms += parseInt(m[2], 10) * 60 * 1000;
          return now + ms;
        }
      },
      // "Resets in X minutes"
      {
        regex: /Resets\s+in\s+(\d+)\s*minutes?/i,
        parse: (m) => now + parseInt(m[1], 10) * 60 * 1000
      }
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern.regex);
      if (match) {
        console.log('Claude Reminder: Matched pattern:', pattern.regex, 'Match:', match[0]);
        return pattern.parse(match);
      }
    }

    return null;
  }

  // Check for reset time in page's embedded JSON/scripts
  function detectResetTimeFromScripts() {
    const scripts = document.querySelectorAll('script');
    const now = Date.now();

    for (const script of scripts) {
      const content = script.textContent || '';

      // Look for JSON with reset time (ISO date strings)
      const isoPatterns = [
        /"resetsAt"\s*:\s*"([^"]+)"/,
        /"reset_at"\s*:\s*"([^"]+)"/,
        /"resetTime"\s*:\s*"([^"]+)"/,
        /"expiresAt"\s*:\s*"([^"]+)"/
      ];

      for (const pattern of isoPatterns) {
        const match = content.match(pattern);
        if (match) {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime()) && date.getTime() > now) {
            console.log('Claude Reminder: Found reset time in script:', match[1]);
            return date.getTime();
          }
        }
      }

      // Look for Unix timestamps
      const timestampMatch = content.match(/"(?:resetsAt|reset_at|resetTime|expiresAt)"\s*:\s*(\d{10,13})/);
      if (timestampMatch) {
        let ts = parseInt(timestampMatch[1], 10);
        if (ts < 10000000000) ts *= 1000;
        if (ts > now) {
          console.log('Claude Reminder: Found reset timestamp:', ts);
          return ts;
        }
      }
    }

    return null;
  }

  // Send detected time to background script
  function notifyBackground(resetTime) {
    if (resetTime && resetTime > Date.now()) {
      const resetDate = new Date(resetTime);
      console.log('Claude Reminder: Detected reset time:', resetDate.toLocaleString());

      browser.runtime.sendMessage({
        action: 'resetTimeFromContent',
        resetTime: resetTime
      }).catch((e) => {
        console.log('Claude Reminder: Could not send message:', e);
      });
    }
  }

  // Run detection
  function runDetection() {
    console.log('Claude Reminder: Running detection...');

    let resetTime = detectResetTime();
    if (!resetTime) {
      resetTime = detectResetTimeFromScripts();
    }

    if (resetTime) {
      notifyBackground(resetTime);
    } else {
      console.log('Claude Reminder: No reset time found on this page');
    }
  }

  // Initial detection after page load
  function init() {
    console.log('Claude Reminder: Content script loaded on', window.location.href);

    // Wait for content to be fully rendered
    setTimeout(runDetection, 2000);

    // Run again after more time in case of slow loading
    setTimeout(runDetection, 5000);

    // Also observe for dynamic changes
    let debounceTimer;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runDetection, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Re-run periodically in case content updates
    setInterval(runDetection, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
