import {
  getSettings,
  setSetting,
  type ExtensionSettings,
  type ApiKeys,
} from '../utils/storage';
import { renderServiceList } from './components';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const settings = await getSettings();
  renderApp(app, settings);
});

function renderApp(container: HTMLElement, settings: ExtensionSettings): void {
  container.innerHTML = `
    <header class="header">
      <h1 class="title">SubTrack AI</h1>
      <button id="btn-settings" class="icon-btn" title="Settings">\u2699</button>
    </header>

    <main id="main-view">
      <section id="service-list" class="service-list"></section>
      <button id="btn-collect" class="btn-primary">Collect Now</button>
      <a class="link-dashboard" href="#" id="link-dashboard">Open Dashboard</a>
    </main>

    <section id="settings-view" class="settings-view hidden">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <button id="btn-back" class="icon-btn">\u2190 Back</button>
        <h2 style="margin:0">Settings</h2>
      </div>

      <div class="settings-group">
        <h3>Supabase</h3>
        <label>URL
          <input type="text" id="input-supabase-url" value="${esc(settings.supabase_url)}" placeholder="https://your-project.supabase.co" />
        </label>
        <label>Anon Key
          <input type="text" id="input-supabase-key" value="${esc(settings.supabase_anon_key)}" placeholder="eyJ..." />
        </label>
        <label>Access Token
          <input type="text" id="input-access-token" value="${esc(settings.user_access_token)}" placeholder="JWT from web dashboard" />
        </label>
      </div>

      <div class="settings-group">
        <h3>API Keys</h3>
        <label>Claude API
          <input type="password" id="input-key-claude" value="${esc(settings.api_keys.claude_api ?? '')}" />
        </label>
        <label>OpenAI
          <input type="password" id="input-key-openai" value="${esc(settings.api_keys.openai ?? '')}" />
        </label>
        <label>ElevenLabs
          <input type="password" id="input-key-elevenlabs" value="${esc(settings.api_keys.elevenlabs ?? '')}" />
        </label>
      </div>

      <p class="hint">Session services (Suno, Midjourney, Meshy) use browser cookies. Just log in to the service in this browser.</p>

      <button id="btn-save" class="btn-primary">Save Settings</button>
    </section>
  `;

  renderServiceList(settings.collection_status);
  updateDashboardLink(settings.supabase_url);
  wireEvents();
}

function wireEvents(): void {
  // 설정 화면 토글
  document.getElementById('btn-settings')!.onclick = () => {
    document.getElementById('main-view')!.classList.add('hidden');
    document.getElementById('settings-view')!.classList.remove('hidden');
  };

  document.getElementById('btn-back')!.onclick = () => {
    document.getElementById('settings-view')!.classList.add('hidden');
    document.getElementById('main-view')!.classList.remove('hidden');
  };

  // 설정 저장
  document.getElementById('btn-save')!.onclick = async () => {
    await setSetting('supabase_url', val('input-supabase-url'));
    await setSetting('supabase_anon_key', val('input-supabase-key'));
    await setSetting('user_access_token', val('input-access-token'));

    const apiKeys: ApiKeys = {};
    const claude = val('input-key-claude');
    const openai = val('input-key-openai');
    const elevenlabs = val('input-key-elevenlabs');
    if (claude) apiKeys.claude_api = claude;
    if (openai) apiKeys.openai = openai;
    if (elevenlabs) apiKeys.elevenlabs = elevenlabs;
    await setSetting('api_keys', apiKeys);

    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });

    updateDashboardLink(val('input-supabase-url'));

    const btn = document.getElementById('btn-save') as HTMLButtonElement;
    btn.textContent = 'Saved!';
    setTimeout(() => (btn.textContent = 'Save Settings'), 1500);
  };

  // 즉시 수집
  document.getElementById('btn-collect')!.onclick = async () => {
    const btn = document.getElementById('btn-collect') as HTMLButtonElement;
    btn.textContent = 'Collecting...';
    btn.disabled = true;

    chrome.runtime.sendMessage({ type: 'COLLECT_NOW' }, async () => {
      const updated = await getSettings();
      renderServiceList(updated.collection_status);
      btn.textContent = 'Collect Now';
      btn.disabled = false;
    });
  };
}

function updateDashboardLink(supabaseUrl: string): void {
  const link = document.getElementById('link-dashboard') as HTMLAnchorElement;
  if (supabaseUrl) {
    // Supabase URL에서 프로젝트 도메인 추출 → 대시보드 URL 추정
    // 실제로는 별도 설정이 필요할 수 있음
    link.href = supabaseUrl.replace('.supabase.co', '');
    link.textContent = 'Open Dashboard';
  } else {
    link.removeAttribute('href');
    link.textContent = 'Configure Supabase first';
  }
}

/** input value 읽기 */
function val(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value?.trim() ?? '';
}

/** HTML escape */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
