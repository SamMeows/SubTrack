import { createClient } from '@supabase/supabase-js';
import {
  getSettings,
  setSetting,
  type ExtensionSettings,
} from '../utils/storage';
import { invalidateClient } from '../utils/supabase';
import { renderServiceList } from './components';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const settings = await getSettings();
  renderApp(app, settings);
});

function renderApp(container: HTMLElement, settings: ExtensionSettings): void {
  const isLoggedIn = !!settings.user_access_token;

  container.innerHTML = `
    <header class="header">
      <h1 class="title">SubTrack AI</h1>
      <button id="btn-settings" class="icon-btn" title="Settings">\u2699</button>
    </header>

    <main id="main-view">
      <section id="service-list" class="service-list"></section>
      <button id="btn-collect" class="btn-primary" ${isLoggedIn ? '' : 'disabled'}>Collect Now</button>
      <a class="link-dashboard" href="http://localhost:3000/dashboard" target="_blank">Open Dashboard</a>
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
      </div>

      <div class="settings-group">
        <h3>로그인</h3>
        ${isLoggedIn ? `
          <p class="hint" style="color:#22c55e;">✓ 로그인됨 (토큰 자동 갱신)</p>
          <button id="btn-logout" class="btn-secondary">로그아웃</button>
        ` : `
          <label>Email
            <input type="email" id="input-email" placeholder="your@email.com" />
          </label>
          <label>Password
            <input type="password" id="input-password" placeholder="••••••••" />
          </label>
          <button id="btn-login" class="btn-primary">로그인</button>
          <p id="login-error" class="hint" style="color:#ef4444;display:none;"></p>
        `}
      </div>

      <p class="hint">각 AI 서비스(Claude, OpenAI, Suno 등)에 브라우저에서 로그인하면 크레딧이 자동 수집됩니다.</p>

      <button id="btn-save" class="btn-primary">Save Settings</button>
    </section>
  `;

  renderServiceList(settings.collection_status);
  wireEvents(isLoggedIn);
}

function wireEvents(isLoggedIn: boolean): void {
  // 설정 화면 토글
  document.getElementById('btn-settings')!.onclick = () => {
    document.getElementById('main-view')!.classList.add('hidden');
    document.getElementById('settings-view')!.classList.remove('hidden');
  };

  document.getElementById('btn-back')!.onclick = () => {
    document.getElementById('settings-view')!.classList.add('hidden');
    document.getElementById('main-view')!.classList.remove('hidden');
  };

  // Supabase 설정 저장
  document.getElementById('btn-save')!.onclick = async () => {
    await setSetting('supabase_url', val('input-supabase-url'));
    await setSetting('supabase_anon_key', val('input-supabase-key'));
    invalidateClient();
    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });

    const btn = document.getElementById('btn-save') as HTMLButtonElement;
    btn.textContent = 'Saved!';
    setTimeout(() => (btn.textContent = 'Save Settings'), 1500);
  };

  // 로그인
  if (!isLoggedIn) {
    document.getElementById('btn-login')!.onclick = async () => {
      const btn = document.getElementById('btn-login') as HTMLButtonElement;
      const errEl = document.getElementById('login-error')!;
      errEl.style.display = 'none';
      btn.textContent = '로그인 중...';
      btn.disabled = true;

      try {
        const url = val('input-supabase-url');
        const key = val('input-supabase-key');
        const email = val('input-email');
        const password = val('input-password');

        if (!url || !key) {
          throw new Error('Supabase URL과 Anon Key를 먼저 입력하세요');
        }
        if (!email || !password) {
          throw new Error('이메일과 비밀번호를 입력하세요');
        }

        // Supabase 설정 먼저 저장
        await setSetting('supabase_url', url);
        await setSetting('supabase_anon_key', key);

        // 로그인
        const supabase = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.session) throw new Error('세션을 생성할 수 없습니다');

        // 토큰 저장
        await setSetting('user_access_token', data.session.access_token);
        await setSetting('user_refresh_token', data.session.refresh_token);

        invalidateClient();
        chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });

        // UI 새로고침
        const settings = await getSettings();
        const app = document.getElementById('app');
        if (app) renderApp(app, settings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errEl.textContent = msg;
        errEl.style.display = 'block';
        btn.textContent = '로그인';
        btn.disabled = false;
      }
    };
  }

  // 로그아웃
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await setSetting('user_access_token', '');
      await setSetting('user_refresh_token', '');
      invalidateClient();
      chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });

      const settings = await getSettings();
      const app = document.getElementById('app');
      if (app) renderApp(app, settings);
    };
  }

  // 즉시 수집
  document.getElementById('btn-collect')!.onclick = async () => {
    console.log('[SubTrack Popup] Collect Now clicked');
    const btn = document.getElementById('btn-collect') as HTMLButtonElement;
    btn.textContent = 'Collecting...';
    btn.disabled = true;

    try {
      chrome.runtime.sendMessage({ type: 'COLLECT_NOW' }, async (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.error('[SubTrack Popup] sendMessage error:', lastError.message);
        }
        console.log('[SubTrack Popup] Response:', response);
        const updated = await getSettings();
        renderServiceList(updated.collection_status);
        btn.textContent = 'Collect Now';
        btn.disabled = false;
      });
    } catch (err) {
      console.error('[SubTrack Popup] Error:', err);
      btn.textContent = 'Collect Now';
      btn.disabled = false;
    }
  };
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
