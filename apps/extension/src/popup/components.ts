import { SERVICE_NAMES } from '@subtrack/shared';
import type { CollectionStatus } from '../utils/storage';

const STATUS_ICONS: Record<CollectionStatus['status'], string> = {
  success: '\u25CF', // ●
  fail: '\u25CF',    // ●
  pending: '\u25CB', // ○ (animated via CSS)
  no_auth: '\u25CB', // ○
};

export function renderServiceList(
  statuses: Record<string, CollectionStatus>,
): void {
  const container = document.getElementById('service-list');
  if (!container) return;
  container.innerHTML = '';

  for (const name of SERVICE_NAMES) {
    const status: CollectionStatus = statuses[name] ?? {
      status: 'no_auth',
      timestamp: '',
    };

    const row = document.createElement('div');
    row.className = `service-row status-${status.status}`;
    row.innerHTML = `
      <span class="status-dot">${STATUS_ICONS[status.status]}</span>
      <span class="service-name">${name}</span>
      <span class="status-label">${formatStatus(status)}</span>
    `;
    container.appendChild(row);
  }
}

function formatStatus(status: CollectionStatus): string {
  switch (status.status) {
    case 'success':
      return `OK ${timeAgo(status.timestamp)}`;
    case 'fail':
      return status.message ?? 'Failed';
    case 'pending':
      return 'Collecting...';
    case 'no_auth':
      return 'Not configured';
  }
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
