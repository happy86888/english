/* ============================================================
   vocab.js · 單字本顯示、SRS 間隔重複、四種複習模式
   ============================================================ */

let vocabFilter = 'all';

window.renderVocab = function() {
  const search = document.getElementById('vocabSearch').value.trim().toLowerCase();
  const list = document.getElementById('vocabList');
  let words = Object.values(State.vocab);

  if (vocabFilter === 'due') words = words.filter(w => w.srs.due <= Date.now());
  else if (vocabFilter === 'learned') words = words.filter(w => w.srs.reps >= 5);

  if (search) words = words.filter(w => w.word.includes(search) || (w.def && w.def.toLowerCase().includes(search)));

  words.sort((a, b) => b.addedAt - a.addedAt);

  document.getElementById('vocabCount').textContent = Object.keys(State.vocab).length;

  if (words.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📖</div>
        <h3>單字本是空的</h3>
        <p>到短文裡點擊任何英文單字來收藏。</p>
      </div>`;
    return;
  }

  list.innerHTML = words.map(w => {
    const due = w.srs.due <= Date.now();
    const dueText = due ? '今日待複習' : `${Math.ceil((w.srs.due - Date.now())/86400000)} 天後`;
    const sourceJump = w.sourceArticleId
      ? `<div class="vocab-source" data-act="jump" data-word="${escapeHTML(w.word)}" data-aid="${escapeHTML(w.sourceArticleId)}">📍 ${escapeHTML(w.sourceSentence || '回到原文')}</div>`
      : '';
    return `
      <div class="vocab-card" data-word="${escapeHTML(w.word)}">
        <div class="vocab-word">
          <span>${escapeHTML(w.word)}</span>
          <div class="vocab-actions">
            <button class="icon-btn" data-act="speak" title="發音">🔊</button>
            <button class="icon-btn" data-act="delete" title="刪除">✕</button>
          </div>
        </div>
        ${w.phonetic ? `<div class="vocab-phonetic">${escapeHTML(w.phonetic)}</div>` : ''}
        <div class="vocab-def"><strong style="color:var(--accent)">${escapeHTML(w.pos)}</strong> · ${escapeHTML(w.def)}</div>
        ${sourceJump}
        <div class="vocab-srs">
          <span>已複習 ${w.srs.reps} 次</span>
          <span class="${due ? 'srs-due' : ''}">${dueText}</span>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.vocab-card').forEach(card => {
    const word = card.dataset.word;
    card.querySelector('[data-act="speak"]')?.addEventListener('click', () => speakWord(word));
    card.querySelector('[data-act="delete"]')?.addEventListener('click', () => removeWord(word));
    card.querySelector('[data-act="jump"]')?.addEventListener('click', e => {
      const aid = e.currentTarget.dataset.aid;
      const w = e.currentTarget.dataset.word;
      openArticle(aid, w);
    });
  });
};

window.initVocabControls = function() {
  document.getElementById('vocabSearch').addEventListener('input', renderVocab);
  document.querySelectorAll('[data-vocab-filter]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-vocab-filter]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      vocabFilter = b.dataset.vocabFilter;
      renderVocab();
    });
  });
};

/* ---------- SRS Review with four graduated modes ---------- */
window.countDueWords = function() {
  return Object.values(State.vocab).filter(w => w.srs.due <= Date.now()).length;
};

function pickReviewMode(word) {
  const reps = word.srs.reps;
  if (reps === 0) return 'recognize';
  if (reps <= 2) return 'dictation';
  if (reps <= 4) return 'spelling';
  if (word.sourceSentence && new RegExp(`\\b${word.word}\\b`, 'i').test(word.sourceSentence)) return 'cloze';
  return 'spelling';
}

let reviewQueue = [];
let reviewIdx = 0;
let currentMode = '';
let userAnswerCorrect = null;

window.renderReview = function() {
  reviewQueue = Object.values(State.vocab).filter(w => w.srs.due <= Date.now());
  reviewQueue.sort(() => Math.random() - 0.5);
  reviewIdx = 0;
  if (reviewQueue.length === 0) {
    document.getElementById('reviewContainer').innerHTML = `
      <div class="review-done">
        <div class="review-done-icon">🌿</div>
        <h2>All <em>caught up</em></h2>
        <p style="color:var(--ink-muted); margin-top:0.5rem">今天沒有需要複習的單字。</p>
        <p style="color:var(--ink-light); margin-top:1rem; font-size:0.9rem">繼續閱讀新文章來累積單字本吧。</p>
      </div>`;
    return;
  }
  showReviewCard();
};

function showReviewCard() {
  if (reviewIdx >= reviewQueue.length) {
    document.getElementById('reviewContainer').innerHTML = `
      <div class="review-done">
        <div class="review-done-icon">✦</div>
        <h2>Session <em>complete</em></h2>
        <p style="color:var(--ink-muted); margin-top:0.5rem">完成 ${reviewQueue.length} 個單字的複習</p>
        <button class="show-btn" style="margin-top:1.5rem" onclick="showView('dashboard')">回到首頁</button>
      </div>`;
    return;
  }
  const w = reviewQueue[reviewIdx];
  currentMode = pickReviewMode(w);
  userAnswerCorrect = null;

  let promptHTML = '';
  let revealHTML = '';

  if (currentMode === 'recognize') {
    promptHTML = `
      <div class="review-word">${escapeHTML(w.word)}</div>
      ${w.phonetic ? `<div class="review-phonetic">${escapeHTML(w.phonetic)} <button class="icon-btn" data-act="speak">🔊</button></div>` : ''}
    `;
    revealHTML = `
      <div class="review-pos">${escapeHTML(w.pos)}</div>
      <div class="review-def">${escapeHTML(w.def)}</div>
      ${w.example ? `<div class="review-example">"${escapeHTML(w.example)}"</div>` : ''}
    `;
  } else if (currentMode === 'dictation') {
    promptHTML = `
      <div style="font-size:3rem; margin: 1rem 0">🔊</div>
      <p style="color:var(--ink-muted); font-size:0.9rem">點下方按鈕聽發音，再打出來</p>
      <button class="show-btn" style="margin-top:0.5rem" data-act="speak" type="button">▶ 播放</button>
      <input type="text" class="review-input" id="reviewInput" placeholder="輸入單字…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
    `;
    revealHTML = `
      <div class="review-word">${escapeHTML(w.word)}</div>
      <div class="review-pos">${escapeHTML(w.pos)}</div>
      <div class="review-def">${escapeHTML(w.def)}</div>
    `;
  } else if (currentMode === 'spelling') {
    promptHTML = `
      <div class="review-prompt">${escapeHTML(w.def)}</div>
      <div style="font-size:0.85rem; color:var(--ink-light); margin-bottom:0.5rem">
        ${escapeHTML(w.pos)} · ${w.word.length} 個字母 · 開頭：<strong style="color:var(--accent)">${escapeHTML(w.word[0])}</strong>
      </div>
      <input type="text" class="review-input" id="reviewInput" placeholder="輸入英文單字…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
    `;
    revealHTML = `
      <div class="review-word">${escapeHTML(w.word)}</div>
      ${w.phonetic ? `<div class="review-phonetic">${escapeHTML(w.phonetic)}</div>` : ''}
      ${w.example ? `<div class="review-example">"${escapeHTML(w.example)}"</div>` : ''}
    `;
  } else if (currentMode === 'cloze') {
    const blanked = escapeHTML(w.sourceSentence).replace(new RegExp(`\\b${w.word}\\b`, 'i'), '<span class="cloze-blank">___</span>');
    promptHTML = `
      <p style="color:var(--ink-muted); font-size:0.85rem; margin-bottom:0.5rem">在原句中填入單字</p>
      <div class="review-cloze">${blanked}</div>
      <div style="font-size:0.85rem; color:var(--ink-light); margin-bottom:0.5rem">
        提示：${escapeHTML(w.def)}
      </div>
      <input type="text" class="review-input" id="reviewInput" placeholder="輸入單字…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
    `;
    revealHTML = `
      <div class="review-word">${escapeHTML(w.word)}</div>
      <div class="review-pos">${escapeHTML(w.pos)}</div>
      <div class="review-cloze" style="margin-top:0.8rem">${escapeHTML(w.sourceSentence)}</div>
    `;
  }

  const sourceLink = w.sourceArticleId
    ? `<div class="review-source-link"><a data-act="jump">↗ 回到原文</a></div>`
    : '';

  document.getElementById('reviewContainer').innerHTML = `
    <div class="review-card">
      <div>
        <span class="review-mode-tag">${MODE_LABELS[currentMode]}</span>
        <div class="review-progress">${reviewIdx+1} / ${reviewQueue.length}</div>
        ${promptHTML}
        <div class="review-back" id="reviewBack">${revealHTML}</div>
      </div>
      <div class="review-actions">
        <button class="show-btn" id="showAnswerBtn">${currentMode === 'recognize' ? '顯示答案' : '檢查 / 顯示答案'}</button>
        <div class="rating-buttons" id="ratingButtons">
          <button class="rating-btn" data-rating="0"><span class="rating-label">Again</span><span class="rating-zh">忘了</span></button>
          <button class="rating-btn" data-rating="1"><span class="rating-label">Hard</span><span class="rating-zh">勉強</span></button>
          <button class="rating-btn" data-rating="2"><span class="rating-label">Good</span><span class="rating-zh">記得</span></button>
          <button class="rating-btn" data-rating="3"><span class="rating-label">Easy</span><span class="rating-zh">輕鬆</span></button>
        </div>
        ${sourceLink}
      </div>
    </div>
  `;

  const reviewContainer = document.getElementById('reviewContainer');
  reviewContainer.querySelectorAll('[data-act="speak"]').forEach(b => {
    b.addEventListener('click', () => speakWord(w.word));
  });
  reviewContainer.querySelectorAll('[data-act="jump"]').forEach(b => {
    b.addEventListener('click', () => openArticle(w.sourceArticleId, w.word));
  });

  if (currentMode === 'dictation') setTimeout(() => speakWord(w.word), 350);

  const input = document.getElementById('reviewInput');
  if (input) {
    setTimeout(() => input.focus(), 100);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('showAnswerBtn').click();
    });
  }

  document.getElementById('showAnswerBtn').onclick = () => {
    if (input) {
      const userAnswer = input.value.trim().toLowerCase();
      const correct = userAnswer === w.word.toLowerCase();
      input.classList.add(correct ? 'correct' : 'wrong');
      input.disabled = true;
      userAnswerCorrect = correct;
      if (correct) toast('✓ 正確！');
      else toast(`正確答案：${w.word}`);
    }
    document.getElementById('reviewBack').classList.add('visible');
    document.getElementById('showAnswerBtn').style.display = 'none';
    const ratings = document.getElementById('ratingButtons');
    ratings.classList.add('visible');

    if (userAnswerCorrect === true) {
      ratings.querySelector('[data-rating="2"]').style.boxShadow = '0 0 0 2px var(--success)';
    } else if (userAnswerCorrect === false) {
      ratings.querySelector('[data-rating="0"]').style.boxShadow = '0 0 0 2px var(--error)';
    }
  };

  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      applySM2(w, rating);
      reviewIdx += 1;
      showReviewCard();
    });
  });
}

function applySM2(word, quality) {
  const qMap = { 0: 1, 1: 3, 2: 4, 3: 5 };
  const q = qMap[quality];
  const s = word.srs;
  if (q < 3) {
    s.reps = 0;
    s.interval = 1;
  } else {
    if (s.reps === 0) s.interval = 1;
    else if (s.reps === 1) s.interval = 3;
    else s.interval = Math.round(s.interval * s.ef);
    s.reps += 1;
    s.ef = Math.max(1.3, s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  s.due = Date.now() + s.interval * 86400000;
  save();
}
