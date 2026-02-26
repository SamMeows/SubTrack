'use client';

import { useState } from 'react';
import type { Subscription } from '@subtrack/shared';
import { SubscriptionCard } from './SubscriptionCard';

type TabKey = 'all' | 'recurring' | 'prepaid';

interface Tab {
  key: TabKey;
  label: string;
  filter: (s: Subscription) => boolean;
}

const TABS: Tab[] = [
  { key: 'all', label: '전체', filter: () => true },
  {
    key: 'recurring',
    label: '정기 구독',
    filter: (s) => (s.billing_type ?? 'recurring') === 'recurring',
  },
  {
    key: 'prepaid',
    label: '선불 충전',
    filter: (s) => s.billing_type === 'prepaid',
  },
];

interface SubscriptionTabsProps {
  subscriptions: Subscription[];
}

export function SubscriptionTabs({ subscriptions }: SubscriptionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const filtered = subscriptions.filter(currentTab.filter);

  // 탭별 개수
  const counts: Record<TabKey, number> = {
    all: subscriptions.length,
    recurring: subscriptions.filter(TABS[1].filter).length,
    prepaid: subscriptions.filter(TABS[2].filter).length,
  };

  return (
    <div>
      {/* 탭 바 */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
          {activeTab === 'recurring' && '정기 구독 서비스가 없습니다.'}
          {activeTab === 'prepaid' && '선불 충전 서비스가 없습니다.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
