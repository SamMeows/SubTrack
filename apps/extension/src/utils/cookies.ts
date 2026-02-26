/**
 * 세션 파서용 쿠키 헬퍼.
 * chrome.cookies API로 특정 도메인의 쿠키를 가져와 Cookie 헤더 문자열로 조합.
 */
export async function getCookieHeader(
  domain: string,
): Promise<string | null> {
  const cookies = await chrome.cookies.getAll({ domain });
  if (cookies.length === 0) return null;
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * URL 기반 쿠키 헬퍼.
 * 실제 브라우저가 해당 URL 방문 시 보내는 쿠키와 동일하게 반환.
 */
export async function getCookieHeaderByUrl(
  url: string,
): Promise<string | null> {
  const cookies = await chrome.cookies.getAll({ url });
  if (cookies.length === 0) return null;
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
