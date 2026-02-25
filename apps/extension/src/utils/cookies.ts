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
