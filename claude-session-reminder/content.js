// Simple content script - runs on claude.ai
(function() {
  const browser = window.browser || window.chrome;

  function detectAndStore() {
    const text = document.body.innerText;

    // Match "Resets in X hr Y min"
    const match = text.match(/Resets\s+in\s+(\d+)\s*hr\s+(\d+)\s*min/i);
    if (match) {
      const hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const resetTime = Date.now() + (hours * 60 * 60 * 1000) + (mins * 60 * 1000);

      browser.storage.local.set({
        resetTime: resetTime,
        lastDetected: Date.now(),
        detectedText: match[0]
      });
      console.log('Claude Reminder: Saved reset time -', match[0]);
      return;
    }

    // Match "Resets in X hr"
    const hrMatch = text.match(/Resets\s+in\s+(\d+)\s*hr/i);
    if (hrMatch) {
      const hours = parseInt(hrMatch[1], 10);
      const resetTime = Date.now() + (hours * 60 * 60 * 1000);

      browser.storage.local.set({
        resetTime: resetTime,
        lastDetected: Date.now(),
        detectedText: hrMatch[0]
      });
      console.log('Claude Reminder: Saved reset time -', hrMatch[0]);
      return;
    }

    // Match "Resets in X min"
    const minMatch = text.match(/Resets\s+in\s+(\d+)\s*min/i);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      const resetTime = Date.now() + (mins * 60 * 1000);

      browser.storage.local.set({
        resetTime: resetTime,
        lastDetected: Date.now(),
        detectedText: minMatch[0]
      });
      console.log('Claude Reminder: Saved reset time -', minMatch[0]);
      return;
    }
  }

  // Run detection multiple times to catch dynamic content
  setTimeout(detectAndStore, 1000);
  setTimeout(detectAndStore, 3000);
  setTimeout(detectAndStore, 5000);

  // Also run on any DOM changes
  const observer = new MutationObserver(detectAndStore);
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('Claude Reminder: Content script loaded');
})();
