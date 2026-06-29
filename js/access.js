/* ============================================================
   access.js · 試用期 + 每日 3 次限制 + 付費白名單
   ------------------------------------------------------------
   邏輯:
   - 第一次進網站 → 產生唯一裝置 ID,並記錄試用起始日
   - 試用期 30 天內 → 完全無限制
   - 試用期過 + 不在白名單 → 每天最多 3 個「不同內容」
     (短文 / 影片 / 口說情境)
   - 在白名單 → 永遠無限制
   - 計數依台灣時間 (UTC+8) 每日 0 點重置
   ============================================================ */

const TRIAL_DAYS = 30;
const DAILY_LIMIT = 3;
const LINE_ID = '@your-line-id'; // ← 改成你真正的 LINE ID

window.Access = (function() {

  /* ---- 取得或產生裝置 ID ---- */
  function getDeviceId() {
    let id = localStorage.getItem('dawn_device_id');
    if (!id) {
      // 產生 UUID v4 風格的 ID
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('dawn_device_id', id);
    }
    return id;
  }

  /* ---- 取得或設定試用起始日 ---- */
  function getTrialStart() {
    let ts = localStorage.getItem('dawn_trial_start');
    if (!ts) {
      ts = Date.now().toString();
      localStorage.setItem('dawn_trial_start', ts);
    }
    return parseInt(ts);
  }

  /* ---- 計算試用剩餘天數 ---- */
  function trialDaysLeft() {
    const start = getTrialStart();
    const elapsed = Date.now() - start;
    const left = Math.ceil(TRIAL_DAYS - elapsed / 86400000);
    return Math.max(0, left);
  }

  /* ---- 是否在試用期內 ---- */
  function isInTrial() {
    return trialDaysLeft() > 0;
  }

  /* ---- 是否在白名單 ---- */
  function isInWhitelist() {
    const id = getDeviceId();
    const list = window.WHITELIST || [];
    return list.some(entry => entry.id === id);
  }

  /* ---- 是否完全無限制(試用期 OR 白名單) ---- */
  function isUnlimited() {
    return isInTrial() || isInWhitelist();
  }

  /* ---- 取得今日台灣時間日期字串(用於計數重置) ---- */
  function getTodayKey() {
    // 以 UTC+8 為基準
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600000);
    return utc8.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /* ---- 取得今日已使用的內容 ID 清單 ---- */
  function getTodayUsage() {
    const key = 'dawn_usage_' + getTodayKey();
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  /* ---- 紀錄使用一個內容(不重複) ---- */
  function recordUsage(contentId) {
    const today = getTodayKey();
    const key = 'dawn_usage_' + today;
    const used = getTodayUsage();
    if (!used.includes(contentId)) {
      used.push(contentId);
      localStorage.setItem(key, JSON.stringify(used));
    }
    // 順便清掉 7 天前的舊記錄
    Object.keys(localStorage)
      .filter(k => k.startsWith('dawn_usage_') && k !== key)
      .forEach(k => {
        const date = k.replace('dawn_usage_', '');
        const daysOld = (new Date(today) - new Date(date)) / 86400000;
        if (daysOld > 7) localStorage.removeItem(k);
      });
  }

  /* ---- 試圖使用一個內容 ----
     回傳 true 表示可以用,並紀錄
     回傳 false 表示超過限制,並跳出付費畫面 */
  function tryUse(contentId) {
    if (isUnlimited()) {
      recordUsage(contentId);
      if (window.updateAccessStatus) updateAccessStatus();
      return true;
    }
    const used = getTodayUsage();
    if (used.includes(contentId)) return true;
    if (used.length < DAILY_LIMIT) {
      recordUsage(contentId);
      if (window.updateAccessStatus) updateAccessStatus();
      return true;
    }
    showPaywall();
    return false;
  }

  /* ---- 取得使用狀態的人類可讀字串 ---- */
  function getStatusText() {
    if (isInWhitelist()) {
      const entry = (window.WHITELIST || []).find(e => e.id === getDeviceId());
      return `付費會員${entry?.name ? ' · ' + entry.name : ''}`;
    }
    if (isInTrial()) {
      return `免費試用中 · 剩 ${trialDaysLeft()} 天`;
    }
    const used = getTodayUsage().length;
    return `今日 ${used}/${DAILY_LIMIT} 次`;
  }

  /* ---- 付費畫面 ---- */
  function showPaywall() {
    const id = getDeviceId();
    const used = getTodayUsage().length;

    let overlay = document.getElementById('paywallOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'paywallOverlay';
      overlay.className = 'paywall-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="paywall-modal">
        <button class="paywall-close" aria-label="關閉">✕</button>
        <div class="paywall-icon">⏸</div>
        <h2 class="paywall-title">今日免費額度<em>已用完</em></h2>
        <p class="paywall-sub">
          你的免費試用期已結束。<br>
          目前每日可閱讀 ${DAILY_LIMIT} 個不同內容。
        </p>
        <div class="paywall-stats">
          <div>今日已使用：<strong>${used} / ${DAILY_LIMIT}</strong></div>
          <div>明日台灣時間 0 點重置</div>
        </div>
        <div class="paywall-divider"></div>
        <h3 class="paywall-section-title">想要無限制?</h3>
        <p class="paywall-sub" style="margin-bottom:1rem">
          加入 LINE 聯絡站長,完成付款後即可解鎖無限制使用。
        </p>
        <div class="paywall-line">
          <span style="font-size:0.85rem; color:var(--ink-muted)">LINE ID</span>
          <strong style="font-family:monospace; font-size:1.1rem">${LINE_ID}</strong>
        </div>
        <div class="paywall-id-box">
          <div style="font-size:0.78rem; color:var(--ink-muted); margin-bottom:0.3rem">
            付款時請提供你的「裝置 ID」:
          </div>
          <div class="paywall-id-row">
            <code id="paywallDeviceId">${id}</code>
            <button class="paywall-copy-btn" id="paywallCopyBtn">複製</button>
          </div>
        </div>
        <button class="paywall-dismiss-btn">我知道了</button>
      </div>
    `;
    overlay.style.display = 'flex';

    overlay.querySelector('.paywall-close').onclick = () => overlay.style.display = 'none';
    overlay.querySelector('.paywall-dismiss-btn').onclick = () => overlay.style.display = 'none';

    overlay.querySelector('#paywallCopyBtn').onclick = () => {
      navigator.clipboard.writeText(id).then(() => {
        const btn = document.getElementById('paywallCopyBtn');
        btn.textContent = '✓ 已複製';
        setTimeout(() => btn.textContent = '複製', 1800);
      }).catch(() => {
        // Fallback for older browsers
        const range = document.createRange();
        range.selectNode(document.getElementById('paywallDeviceId'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        document.getElementById('paywallCopyBtn').textContent = '✓ 已選取,請手動複製';
      });
    };

    // 點擊背景關閉
    overlay.onclick = e => {
      if (e.target === overlay) overlay.style.display = 'none';
    };
  }

  /* ---- 主動顯示帳號狀態(供設定頁、首頁呼叫) ---- */
  function getInfo() {
    return {
      deviceId: getDeviceId(),
      trialDaysLeft: trialDaysLeft(),
      isInTrial: isInTrial(),
      isInWhitelist: isInWhitelist(),
      isUnlimited: isUnlimited(),
      todayUsed: getTodayUsage().length,
      dailyLimit: DAILY_LIMIT,
      statusText: getStatusText(),
      lineId: LINE_ID
    };
  }

  // 初始化:第一次載入時就建立裝置 ID 與試用起始日
  getDeviceId();
  getTrialStart();

  return { tryUse, getInfo, showPaywall };
})();
