/**
 * Meshy AI 페이지에서 Supabase access_token을 추출하여
 * chrome.storage.local에 캐시하는 content script.
 *
 * 쿠키 포맷: sb-auth-auth-token.N = base64-<base64(JSON)>
 * JSON 구조: { access_token: "eyJ...", refresh_token: "...", ... }
 */
export {};

(function meshyTokenExtractor() {
  function extractAndCache(): void {
    try {
      const rawCookie = document.cookie;
      if (!rawCookie) return;

      // sb-auth-auth-token 청크 수집
      const cookies = rawCookie.split(';').map((c) => c.trim());
      const chunks: { index: number; value: string }[] = [];
      for (const cookie of cookies) {
        const match = cookie.match(/^sb-auth-auth-token\.(\d+)=(.+)$/);
        if (match) {
          chunks.push({ index: parseInt(match[1], 10), value: match[2] });
        }
      }

      if (chunks.length === 0) return;

      chunks.sort((a, b) => a.index - b.index);
      let combined = chunks.map((c) => c.value).join('');

      // "base64-" 접두사 제거 후 base64 디코딩 → JSON 파싱
      if (combined.startsWith('base64-')) {
        combined = combined.slice(7); // "base64-" 제거
      }

      const decoded = atob(combined);
      const parsed = JSON.parse(decoded);
      const accessToken = parsed.access_token;

      if (!accessToken) {
        console.log('[SubTrack] Meshy: no access_token in parsed cookie data');
        return;
      }

      chrome.storage.local.set({ meshy_access_token: accessToken });
      console.log('[SubTrack] Meshy access_token cached to storage');
    } catch (e) {
      console.log('[SubTrack] Meshy token extraction error:', e);
    }
  }

  extractAndCache();

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      extractAndCache();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
