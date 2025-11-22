// Content script for Claude Session Limit Reminder
// Runs on claude.ai pages to detect reset time

(function() {
  'use strict';

  const browser = window.browser || window.chrome;

  // Function to parse reset time from visible page content
  function detectResetTime() {
    const pageText = document.body.innerText;
    const now = Date.now();

    // Patterns to look for
    const patterns = [
      // "Resets in X hours Y minutes"
      {
        regex: /resets?\s+in\s+(\d+)\s*(?:hours?|hrs?)\s*(?:and\s+)?(\d+)?\s*(?:minutes?|mins?)?/i,
        parse: (m) => {
          let ms = parseInt(m[1], 10) * 60 * 60 * 1000;
          if (m[2]) ms += parseInt(m[2], 10) * 60 * 1000;
          return now + ms;
        }
      },
      // "Resets in X minutes"
      {
        regex: /resets?\s+in\s+(\d+)\s*(?:minutes?|mins?)/i,
        parse: (m) => now + parseInt(m[1], 10) * 60 * 1000
      },
      // "X hours until" patterns
      {
        regex: /(\d+)\s*(?:hours?|hrs?)\s*(?:and\s+)?(\d+)?\s*(?:minutes?|mins?)?\s*until/i,
        parse: (m) => {
          let ms = parseInt(m[1], 10) * 60 * 60 * 1000;
          if (m[2]) ms += parseInt(m[2], 10) * 60 * 1000;
          return now + ms;
        }
      },
      // "Xh Ym" format
      {
        regex: /(\d+)\s*h\s*(\d+)\s*m(?:in)?(?:\s|$|<)/i,
        parse: (m) => {
          let ms = parseInt(m[1], 10) * 60 * 60 * 1000;
          ms += parseInt(m[2], 10) * 60 * 1000;
          return now + ms;
        }
      }
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern.regex);
      if (match) {
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

      // Look for JSON with reset time
      const patterns = [
        /"resetsAt"\s*:\s*"([^"]+)"/,
        /"reset_at"\s*:\s*"([^"]+)"/,
        /"resetTime"\s*:\s*"([^"]+)"/,
        /"expiresAt"\s*:\s*"([^"]+)"/,
        /"rateLimit"[^}]*"resetsAt"\s*:\s*"([^"]+)"/
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return date.getTime();
          }
        }
      }

      // Look for Unix timestamps
      const timestampPatterns = [
        /"(?:resetsAt|reset_at|resetTime|expiresAt)"\s*:\s*(\d{10,13})/
      ];

      for (const pattern of timestampPatterns) {
        const match = content.match(pattern);
        if (match) {
          let ts = parseInt(match[1], 10);
          if (ts < 10000000000) ts *= 1000;
          return ts;
        }
      }
    }

    return null;
  }

  // Send detected time to background script
  function notifyBackground(resetTime) {
    if (resetTime && resetTime > Date.now()) {
      console.log('Claude Session Reminder: Detected reset time:', new Date(resetTime).toLocaleString());
      browser.runtime.sendMessage({
        action: 'resetTimeFromContent',
        resetTime: resetTime
      }).catch(() => {});
    }
  }

  // Run detection
  function runDetection() {
    let resetTime = detectResetTime();
    if (!resetTime) {
      resetTime = detectResetTimeFromScripts();
    }
    if (resetTime) {
      notifyBackground(resetTime);
    }
  }

  // Initial detection after page load
  function init() {
    // Wait for content to be fully rendered
    setTimeout(runDetection, 2000);

    // Also observe for dynamic changes
    const observer = new MutationObserver(() => {
      runDetection();
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
