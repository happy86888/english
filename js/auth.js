/* ============================================================
   auth.js · 通行碼鎖
   ------------------------------------------------------------
   ★ 改密碼：修改下面 PASSWORD 的值，push 到 GitHub 即可。
   ★ 想「踢所有人」：改成新密碼推上去，所有人下次重整都要輸新的。
   ★ 不會記住密碼：每次重整都要重新輸入。
   ★ 純前端鎖只能擋普通訪客；技術人按 F12 看原始碼能看到密碼。
   ============================================================ */

const PASSWORD = 'briankill'; // ← 把這裡改成你的密碼

(function() {
  // 立刻在 body 還沒 ready 前蓋一層遮罩，避免內容閃出來
  const style = document.createElement('style');
  style.textContent = `
    .auth-lock-overlay {
      position: fixed; inset: 0;
      background: #f5f1e8;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 1.5rem;
      text-align: center;
    }
    .auth-lock-overlay.dark { background: #1a1612; color: #f0e8d8; }
    .auth-lock-icon {
      width: 56px; height: 56px;
      background: #b8473b;
      border-radius: 50%;
      position: relative;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .auth-lock-icon::after {
      content: '';
      position: absolute;
      width: 56px; height: 56px;
      background: #f5f1e8;
      border-radius: 50%;
      top: -20px; left: 16px;
    }
    .auth-lock-overlay.dark .auth-lock-icon::after { background: #1a1612; }
    .auth-lock-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 2rem;
      font-weight: 500;
      letter-spacing: -0.02em;
      margin-bottom: 0.3rem;
      color: #1a1a1a;
    }
    .auth-lock-overlay.dark .auth-lock-title { color: #f0e8d8; }
    .auth-lock-title em { color: #b8473b; font-style: italic; font-weight: 500; }
    .auth-lock-sub {
      color: #5a5a5a;
      font-size: 0.95rem;
      margin-bottom: 1.8rem;
    }
    .auth-lock-overlay.dark .auth-lock-sub { color: #b8ad95; }
    .auth-lock-form {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      width: 100%;
      max-width: 320px;
    }
    .auth-lock-input {
      padding: 0.85rem 1rem;
      border: 2px solid #d8d0bf;
      border-radius: 10px;
      background: #faf6ed;
      color: #1a1a1a;
      font-family: inherit;
      font-size: 1.05rem;
      text-align: center;
      letter-spacing: 0.1em;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .auth-lock-input:focus { border-color: #b8473b; }
    .auth-lock-input.wrong {
      border-color: #c62828;
      animation: authShake 0.4s;
    }
    .auth-lock-overlay.dark .auth-lock-input {
      background: #221d18;
      color: #f0e8d8;
      border-color: #3a3228;
    }
    @keyframes authShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }
    .auth-lock-btn {
      padding: 0.85rem 1rem;
      background: #b8473b;
      color: white;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .auth-lock-btn:hover { transform: scale(1.02); }
    .auth-lock-msg {
      color: #c62828;
      font-size: 0.85rem;
      min-height: 1.2em;
      margin-top: 0.3rem;
    }
  `;
  document.head.appendChild(style);

  // 偵測使用者主題（從 localStorage 拿，跟主程式一致）
  let isDark = false;
  try {
    const theme = JSON.parse(localStorage.getItem('dawn_theme'));
    isDark = theme === 'dark';
  } catch {}

  const overlay = document.createElement('div');
  overlay.className = 'auth-lock-overlay' + (isDark ? ' dark' : '');
  overlay.innerHTML = `
    <div class="auth-lock-icon"></div>
    <div class="auth-lock-title">Dawn <em>Reader</em></div>
    <div class="auth-lock-sub">請輸入通行碼</div>
    <form class="auth-lock-form" id="authForm">
      <input type="password" class="auth-lock-input" id="authInput"
        placeholder="通行碼" autocomplete="off" autocapitalize="off"
        autocorrect="off" spellcheck="false">
      <button type="submit" class="auth-lock-btn">進入</button>
      <div class="auth-lock-msg" id="authMsg"></div>
    </form>
  `;

  // 用 documentElement 確保即使 body 還沒就緒也能蓋住
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay), { once: true });
  }

  function attachHandlers() {
    const form = document.getElementById('authForm');
    const input = document.getElementById('authInput');
    const msg = document.getElementById('authMsg');
    if (!form || !input) return;

    setTimeout(() => input.focus(), 100);

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (input.value === PASSWORD) {
        overlay.style.transition = 'opacity 0.4s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 400);
      } else {
        input.classList.add('wrong');
        msg.textContent = '通行碼錯誤';
        setTimeout(() => input.classList.remove('wrong'), 500);
        input.select();
      }
    });
  }

  if (document.body) attachHandlers();
  else document.addEventListener('DOMContentLoaded', attachHandlers, { once: true });
})();
