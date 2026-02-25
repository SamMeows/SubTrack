/** Chrome 알림 헬퍼 */

export function notifySessionExpired(serviceName: string): void {
  chrome.notifications.create(`session-expired-${serviceName}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'SubTrack AI',
    message: `${serviceName} 세션이 만료되었습니다. 다시 로그인해주세요.`,
  });
}

export function notifyCollectionError(
  serviceName: string,
  error: string,
): void {
  chrome.notifications.create(`error-${serviceName}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'SubTrack AI - 수집 오류',
    message: `${serviceName} 수집 실패: ${error}`,
  });
}
