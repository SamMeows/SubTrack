/** chrome.storage.local 타입 래퍼 */

export interface CollectionStatus {
  status: 'success' | 'fail' | 'pending' | 'no_auth';
  message?: string;
  timestamp: string;
}

export interface ApiKeys {
  claude_api?: string;
  openai?: string;
  elevenlabs?: string;
}

export interface ExtensionSettings {
  supabase_url: string;
  supabase_anon_key: string;
  user_access_token: string;
  api_keys: ApiKeys;
  collection_status: Record<string, CollectionStatus>;
  last_collected: Record<string, string>;
}

const DEFAULTS: ExtensionSettings = {
  supabase_url: '',
  supabase_anon_key: '',
  user_access_token: '',
  api_keys: {},
  collection_status: {},
  last_collected: {},
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(DEFAULTS);
  return result as ExtensionSettings;
}

export async function setSetting<K extends keyof ExtensionSettings>(
  key: K,
  value: ExtensionSettings[K],
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getApiKey(
  service: keyof ApiKeys,
): Promise<string | undefined> {
  const settings = await getSettings();
  return settings.api_keys[service];
}

export async function setCollectionStatus(
  serviceName: string,
  status: CollectionStatus,
): Promise<void> {
  const settings = await getSettings();
  settings.collection_status[serviceName] = status;
  await chrome.storage.local.set({
    collection_status: settings.collection_status,
  });
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear();
}
