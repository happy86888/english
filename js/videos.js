/* ============================================================
   videos.js · 影片專區
   特點：
   - iframe 載入失敗時自動切換到「在 YouTube 開啟」備援
   - 「每日新鮮」分類從 YouTube Data API 即時搜尋當天熱門影片
   ============================================================ */

let videoFilter = 'fresh';

window.renderVideos = function() {
  const grid = document.getElementById('videoGrid');

  // 「每日新鮮」走獨立路徑
  if (videoFilter === 'fresh') {
    renderFreshVideos(grid);
    return;
  }

  const all = [...BUILTIN_VIDEOS, ...(State.customVideos || [])];
  const filtered = videoFilter === 'all' ? all : all.filter(v => v.cat === videoFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🎬</div>
        <h3>沒有影片</h3>
        <p>切換分類或加入自訂影片。</p>
      </div>`;
    return;
  }

  const catLabels = { youtube: '英文教學', ted: 'TED', short: '英文短片', fresh: '每日新鮮' };
  grid.innerHTML = filtered.map(v => `
    <div class="video-card" data-id="${escapeHTML(v.id)}">
      <div class="video-thumb" style="background-image:url('https://img.youtube.com/vi/${escapeHTML(v.youtubeId)}/hqdefault.jpg')"></div>
      <div class="video-meta-row">
        <span class="video-cat ${v.cat}">${catLabels[v.cat] || v.cat}</span>
        <h3 class="video-card-title">${escapeHTML(v.title)}</h3>
        <p class="video-card-desc">${escapeHTML(v.desc || '')}</p>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => openVideo(card.dataset.id));
  });
};

/* ---------- 每日新鮮影片 ---------- */
async function renderFreshVideos(grid) {
  // 沒填 YouTube key
  if (!State.youtubeKey) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📡</div>
        <h3>需要 YouTube Data API key</h3>
        <p style="line-height:1.7">
          這個分類會每天從 YouTube 抓新影片。<br>
          請到「設定」填入 YouTube API key（免費，到 Google Cloud Console 申請）。
        </p>
        <button class="action-btn" style="margin-top:1rem" onclick="showView('settings')">前往設定</button>
      </div>`;
    return;
  }

  // 顯示目前選的程度與搜尋詞
  const level = State.ytLevel;
  const keywords = State.ytSearchKeywords[level] || '';
  const headerHTML = `
    <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem">
      <div style="font-size:0.9rem; color:var(--ink-muted)">
        <strong>程度：</strong>${level} ·
        <strong>關鍵字：</strong><span style="font-style:italic">${escapeHTML(keywords)}</span>
      </div>
      <button class="action-btn secondary" id="ytRefreshBtn" style="font-size:0.8rem">↻ 重新搜尋</button>
    </div>`;

  // 檢查快取（同一天同一程度，直接用快取，不浪費 quota）
  const today = new Date().toDateString();
  const cache = State.ytCachedVideos;
  const useCache = cache.date === today && cache.level === level && cache.videos?.length > 0;

  if (useCache) {
    grid.innerHTML = headerHTML + cache.videos.map(freshVideoCardHTML).join('');
    bindFreshCardClicks(grid, cache.videos);
    document.getElementById('ytRefreshBtn').onclick = () => fetchFreshVideos(grid, true);
    return;
  }

  // 沒快取或快取過期，去搜尋
  await fetchFreshVideos(grid, false);
}

async function fetchFreshVideos(grid, forceRefresh) {
  const level = State.ytLevel;
  const keywords = State.ytSearchKeywords[level] || '';
  const headerHTML = `
    <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem">
      <div style="font-size:0.9rem; color:var(--ink-muted)">
        <strong>程度：</strong>${level} ·
        <strong>關鍵字：</strong><span style="font-style:italic">${escapeHTML(keywords)}</span>
      </div>
      <button class="action-btn secondary" id="ytRefreshBtn" style="font-size:0.8rem" disabled>搜尋中…</button>
    </div>`;

  grid.innerHTML = headerHTML + `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="spinner"></div>
      <p style="color:var(--ink-muted); margin-top:1rem">從 YouTube 抓新鮮影片中…</p>
    </div>`;

  try {
    const videos = await searchYouTube(keywords, level);
    if (videos.length === 0) {
      grid.innerHTML = headerHTML + `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">😶</div>
          <h3>沒有找到影片</h3>
          <p>試試到設定改關鍵字。</p>
        </div>`;
      return;
    }

    // 寫入快取
    State.ytCachedVideos = { date: new Date().toDateString(), level, videos };
    Store.set('yt_cached', State.ytCachedVideos);

    grid.innerHTML = headerHTML + videos.map(freshVideoCardHTML).join('');
    bindFreshCardClicks(grid, videos);
    document.getElementById('ytRefreshBtn').onclick = () => fetchFreshVideos(grid, true);
  } catch (err) {
    grid.innerHTML = headerHTML + `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠</div>
        <h3>搜尋失敗</h3>
        <p style="color:var(--error)">${escapeHTML(err.message)}</p>
        <p style="margin-top:1rem; font-size:0.85rem">常見原因：API key 無效、配額用完、API 未啟用</p>
      </div>`;
  }
}

function freshVideoCardHTML(v) {
  return `
    <div class="video-card" data-yt-id="${escapeHTML(v.youtubeId)}">
      <div class="video-thumb" style="background-image:url('${escapeHTML(v.thumb)}')"></div>
      <div class="video-meta-row">
        <span class="video-cat fresh">每日新鮮</span>
        <h3 class="video-card-title">${escapeHTML(v.title)}</h3>
        <p class="video-card-desc">${escapeHTML(v.channel)} · ${escapeHTML(v.desc)}</p>
      </div>
    </div>`;
}

function bindFreshCardClicks(grid, videos) {
  grid.querySelectorAll('.video-card[data-yt-id]').forEach(card => {
    card.addEventListener('click', () => {
      const v = videos.find(x => x.youtubeId === card.dataset.ytId);
      if (v) openFreshVideo(v);
    });
  });
}

async function searchYouTube(query, level) {
  // 過濾關鍵字：避開常見的非學習內容
  const negativeFilter = ['shorts', 'reaction', 'prank', '#shorts'];
  const queryWithFilter = query + ' -shorts -reaction -prank';

  const params = new URLSearchParams({
    part: 'snippet',
    q: queryWithFilter,
    type: 'video',
    videoEmbeddable: 'true',
    videoDuration: 'medium', // 4-20 分鐘，避開廣告 shorts 和過長影片
    safeSearch: 'strict',
    relevanceLanguage: 'en',
    maxResults: '12',
    order: 'relevance',
    key: State.youtubeKey
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API ${res.status}: ${err.slice(0, 150)}`);
  }
  const data = await res.json();

  const videos = (data.items || []).map(item => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    desc: (item.snippet.description || '').slice(0, 100),
    thumb: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
    publishedAt: item.snippet.publishedAt
  }));

  // 標題過濾：去除明顯不適合的
  return videos.filter(v => {
    const title = v.title.toLowerCase();
    return !negativeFilter.some(bad => title.includes(bad));
  }).slice(0, 9);
}

function openFreshVideo(v) {
  // 用一般 openVideo 流程播放，但沒有逐字稿
  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(v.youtubeId)}`;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(v.youtubeId)}?autoplay=1&rel=0`;

  document.getElementById('videoFrame').innerHTML = `
    <iframe id="videoIframe" src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    <div class="video-fallback-bar">
      <span style="font-size:0.85rem; opacity:0.7">如果影片無法播放：</span>
      <a href="${youtubeUrl}" target="_blank" class="action-btn secondary" style="text-decoration:none">↗ 在 YouTube 開啟</a>
    </div>
  `;

  document.getElementById('videoTranscript').innerHTML = `
    <h4>${escapeHTML(v.title)}</h4>
    <p style="color:var(--ink-muted); font-size:0.85rem; line-height:1.7">
      <strong>頻道：</strong>${escapeHTML(v.channel)}<br>
      <strong>發布：</strong>${new Date(v.publishedAt).toLocaleDateString('zh-TW')}
    </p>
    <p style="color:var(--ink-muted); font-size:0.9rem; line-height:1.7; margin-top:1rem">
      這是「每日新鮮」抓來的影片，沒有預先準備逐字稿。建議：<br>
      ① 在 YouTube 上按 CC 開啟自動字幕<br>
      ② 用「在 YouTube 開啟」按鈕跳出去看
    </p>`;

  document.getElementById('videoOverlay').classList.add('visible');
}

window.openVideo = function(id) {
  const all = [...BUILTIN_VIDEOS, ...(State.customVideos || [])];
  const v = all.find(x => x.id === id);
  if (!v) return;

  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(v.youtubeId)}`;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(v.youtubeId)}?autoplay=1&rel=0`;

  document.getElementById('videoFrame').innerHTML = `
    <iframe id="videoIframe" src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    <div class="video-fallback-bar">
      <span style="font-size:0.85rem; opacity:0.7">如果影片無法播放：</span>
      <a href="${youtubeUrl}" target="_blank" class="action-btn secondary" style="text-decoration:none">↗ 在 YouTube 開啟</a>
    </div>
  `;

  const transcriptEl = document.getElementById('videoTranscript');
  if (v.transcriptEn && v.transcriptEn.length) {
    const lines = v.transcriptEn.map((en, i) => {
      const zh = v.transcriptZh?.[i] || '';
      return `<p>${tokenize(en)}</p>${zh ? `<div class="transcript-zh">${escapeHTML(zh)}</div>` : ''}`;
    }).join('');
    transcriptEl.innerHTML = `<h4>逐字稿 · 點單字可查詢</h4>${lines}`;
    State.currentArticle = { id: 'video-' + v.id, en: v.transcriptEn };
    transcriptEl.querySelectorAll('.word').forEach(span => {
      if (State.vocab[span.dataset.word]) span.classList.add('saved');
      span.addEventListener('click', e => {
        e.stopPropagation();
        lookupWord(span.dataset.word, e.clientX, e.clientY);
      });
    });
  } else {
    transcriptEl.innerHTML = `
      <h4>沒有逐字稿</h4>
      <p style="color:var(--ink-muted); font-size:0.9rem; line-height:1.7">
        這部影片沒有附逐字稿。建議：<br>
        ① 在 YouTube 上按 CC 開啟自動字幕<br>
        ② 用「在 YouTube 開啟」按鈕跳出去看（左側影片下方）<br>
        ③ 自己加一部影片並貼上字幕，到「＋ 加入自訂影片」設定為「英文短片」分類
      </p>`;
  }

  document.getElementById('videoOverlay').classList.add('visible');
};

window.closeVideo = function() {
  document.getElementById('videoFrame').innerHTML = '';
  document.getElementById('videoOverlay').classList.remove('visible');
};

window.initVideos = function() {
  document.getElementById('videoCloseBtn').addEventListener('click', closeVideo);

  document.querySelectorAll('[data-vcat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vcat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      videoFilter = btn.dataset.vcat;
      renderVideos();
    });
  });

  // Add custom video modal
  const addVidModal = document.getElementById('addVideoModal');
  document.getElementById('addVideoBtn').addEventListener('click', () => addVidModal.classList.add('visible'));
  document.getElementById('addVidCancelBtn').addEventListener('click', () => addVidModal.classList.remove('visible'));

  document.getElementById('addVidSubmitBtn').addEventListener('click', () => {
    const url = document.getElementById('addVidUrl').value.trim();
    const title = document.getElementById('addVidTitle').value.trim();
    const cat = document.getElementById('addVidCat').value;
    const enRaw = document.getElementById('addVidEn').value.trim();
    const zhRaw = document.getElementById('addVidZh').value.trim();

    const ytId = extractYouTubeId(url);
    if (!ytId) { toast('無法解析 YouTube 網址'); return; }
    if (!title) { toast('請填寫標題'); return; }

    const splitLines = s => s.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const transcriptEn = enRaw ? splitLines(enRaw) : null;
    const transcriptZh = zhRaw ? splitLines(zhRaw) : null;

    const video = {
      id: 'custom-vid-' + Date.now(),
      cat,
      youtubeId: ytId,
      title,
      desc: '自訂影片',
      transcriptEn,
      transcriptZh
    };
    State.customVideos = State.customVideos || [];
    State.customVideos.push(video);
    save();
    addVidModal.classList.remove('visible');
    ['addVidUrl', 'addVidTitle', 'addVidEn', 'addVidZh'].forEach(id => document.getElementById(id).value = '');
    toast('已加入影片庫');
    renderVideos();
  });
};

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
