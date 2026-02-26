/**
 * OpenAI platform.openai.com 페이지에서 Auth0 access_token을 추출하여
 * chrome.storage.local에 캐시하는 content script.
 */
export {};

(function openaiTokenExtractor() {
  function extractAndCacheToken(): void {
    try {
      const key = Object.keys(localStorage).find((k) =>
        k.includes('auth0spajs'),
      );
      if (!key) return;

      const raw = localStorage.getItem(key);
      if (!raw) return;

      const data = JSON.parse(raw);
      const accessToken = data?.body?.access_token;
      if (!accessToken) return;

      chrome.storage.local.set({ openai_access_token: accessToken });
      console.log('[SubTrack] OpenAI token cached to storage');
    } catch {
      // ignore
    }
  }

  extractAndCacheToken();

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      extractAndCacheToken();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
