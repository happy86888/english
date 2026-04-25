/* ============================================================
   videos.js · 影片專區
   特點：iframe 載入失敗時自動切換到「在 YouTube 開啟」備援。
   ============================================================ */

let videoFilter = 'all';

window.renderVideos = function() {
  const grid = document.getElementById('videoGrid');
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

  const catLabels = { youtube: '英文教學', ted: 'TED', short: '英文短片' };
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

window.openVideo = function(id) {
  const all = [...BUILTIN_VIDEOS, ...(State.customVideos || [])];
  const v = all.find(x => x.id === id);
  if (!v) return;

  const youtubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(v.youtubeId)}`;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(v.youtubeId)}?autoplay=1&rel=0`;

  // 預先放上「在 YouTube 開啟」備援按鈕（無論 iframe 是否成功，都能點）
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
        ③ 自己加一部影片並貼上字幕，到「＋ 加入自訂影片」設定為「雙語短片」分類
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
