/* ============================================================
   reader.js · 閱讀頁、單字查詢彈窗、TTS 朗讀、跟讀錄音
   ============================================================ */

/* ---------- Article reader ---------- */
window.openArticle = function(id, highlightWord) {
  const article = getAllArticles().find(a => a.id === id);
  if (!article) return;
  State.currentArticle = article;

  document.getElementById('readerLevel').textContent = article.level;
  document.getElementById('readerLevel').className = `reader-level level-badge level-${article.level}`;
  document.getElementById('readerTitle').textContent = article.title;
  document.getElementById('readerTitleZh').textContent = article.titleZh;

  const sourceLinkEl = document.getElementById('readerSourceLink');
  if (article.sourceUrl) {
    sourceLinkEl.style.display = 'block';
    document.getElementById('readerSourceA').href = article.sourceUrl;
  } else {
    sourceLinkEl.style.display = 'none';
  }

  const text = document.getElementById('readerText');
  text.innerHTML = article.en.map(p => '<p>' + tokenize(p) + '</p>').join('');

  const zh = document.getElementById('readerZh');
  zh.innerHTML = article.zh.map(p => '<p>'+escapeHTML(p)+'</p>').join('');
  zh.classList.remove('visible');
  document.getElementById('toggleZh').textContent = '顯示中文';
  document.getElementById('toggleZh').classList.remove('active');

  document.getElementById('audioBar').classList.remove('visible');
  document.getElementById('toggleAudio').classList.remove('active');
  document.getElementById('quizSection').classList.remove('visible');
  document.getElementById('toggleQuiz').classList.remove('active');

  renderQuiz(article);

  if (!State.completed[id]) {
    State.completed[id] = Date.now();
    updateStreak();
    save();
  }

  highlightSavedWords();
  attachWordClickHandlers();
  showView('reader');

  if (highlightWord) {
    setTimeout(() => {
      const target = document.querySelector(`.reader-text .word[data-word="${highlightWord.toLowerCase()}"]`);
      if (target) {
        target.classList.add('highlight-source');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => target.classList.remove('highlight-source'), 2000);
      }
    }, 400);
  }
};

window.tokenize = function(paragraph) {
  return paragraph.split(/(\s+)/).map(token => {
    if (/^\s+$/.test(token)) return token;
    const match = token.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
    if (!match) return escapeHTML(token);
    const [, pre, word, post] = match;
    return `${escapeHTML(pre)}<span class="word" data-word="${word.toLowerCase()}">${escapeHTML(word)}</span>${escapeHTML(post)}`;
  }).join('');
};

window.highlightSavedWords = function() {
  document.querySelectorAll('.reader-text .word, .video-transcript .word').forEach(span => {
    if (State.vocab[span.dataset.word]) span.classList.add('saved');
    else span.classList.remove('saved');
  });
};

window.attachWordClickHandlers = function() {
  document.querySelectorAll('.reader-text .word').forEach(span => {
    span.addEventListener('click', e => {
      e.stopPropagation();
      lookupWord(span.dataset.word, e.clientX, e.clientY);
    });
  });
};

/* ---------- Quiz ---------- */
window.renderQuiz = function(article) {
  const container = document.getElementById('quizQuestions');
  if (!article.quiz || article.quiz.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-muted); padding:1rem 0">本篇無測驗題目</p>';
    return;
  }
  container.innerHTML = article.quiz.map((q, qi) => `
    <div class="quiz-q">
      <div class="quiz-q-text">${qi+1}. ${escapeHTML(q.q)}</div>
      ${q.options.map((opt, oi) => `<button class="quiz-option" data-q="${qi}" data-o="${oi}" data-a="${q.a}">${escapeHTML(opt)}</button>`).join('')}
    </div>
  `).join('');
  container.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = parseInt(btn.dataset.q), o = parseInt(btn.dataset.o), a = parseInt(btn.dataset.a);
      container.querySelectorAll(`[data-q="${q}"]`).forEach(b => {
        b.disabled = true;
        const bo = parseInt(b.dataset.o);
        if (bo === a) b.classList.add('correct');
        else if (bo === o && o !== a) b.classList.add('wrong');
      });
    });
  });
};

/* ---------- Word lookup popup ---------- */
const popup = () => document.getElementById('wordPopup');

window.lookupWord = async function(word, x, y) {
  const p = popup();
  p.style.display = 'block';
  p.innerHTML = `<div class="popup-loading">載入中…</div>`;
  positionPopup(x, y);

  const stored = State.vocab[word];
  let sourceSentence = '';
  let sourceArticleId = '';
  if (State.currentArticle) {
    sourceArticleId = State.currentArticle.id;
    for (const para of State.currentArticle.en) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(sentence)) {
          sourceSentence = sentence.trim();
          break;
        }
      }
      if (sourceSentence) break;
    }
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const entry = data[0];
    const phonetic = entry.phonetic || (entry.phonetics?.find(p=>p.text)?.text) || '';
    const meanings = entry.meanings.slice(0, 2).map(m => ({
      pos: m.partOfSpeech,
      def: m.definitions[0].definition,
      example: m.definitions[0].example || ''
    }));
    renderPopup(word, phonetic, meanings, stored, sourceSentence, sourceArticleId, x, y);
  } catch {
    if (stored) {
      renderPopup(word, stored.phonetic, [{pos: stored.pos, def: stored.def, example: stored.example}], stored, sourceSentence, sourceArticleId, x, y);
    } else {
      p.innerHTML = `
        <div class="popup-word">${escapeHTML(word)}<button class="popup-speak" data-act="speak">🔊</button></div>
        <div class="popup-error">查無此單字</div>
        <div class="popup-actions">
          <button class="popup-btn secondary" data-act="close">關閉</button>
        </div>`;
      p.querySelector('[data-act="speak"]').addEventListener('click', () => speakWord(word));
      p.querySelector('[data-act="close"]').addEventListener('click', closePopup);
    }
  }
};

window.renderPopup = function(word, phonetic, meanings, stored, sourceSentence, sourceArticleId, x, y) {
  const isAlreadySaved = !!stored;
  const meaningsHTML = meanings.map(m => `
    <div class="popup-pos">${escapeHTML(m.pos)}</div>
    <div class="popup-def">${escapeHTML(m.def)}</div>
    ${m.example ? `<div class="popup-def" style="font-style:italic; color:var(--ink-light); font-size:0.82rem">"${escapeHTML(m.example)}"</div>` : ''}
  `).join('');

  const p = popup();
  p.innerHTML = `
    <div class="popup-word">${escapeHTML(word)}<button class="popup-speak" data-act="speak">🔊</button></div>
    ${phonetic ? `<div class="popup-phonetic">${escapeHTML(phonetic)}</div>` : ''}
    <div class="popup-body">${meaningsHTML}</div>
    <div class="popup-actions">
      ${isAlreadySaved
        ? `<button class="popup-btn secondary" data-act="remove">已收藏 · 移除</button>`
        : `<button class="popup-btn" data-act="save">＋ 加入單字本</button>`
      }
      <button class="popup-btn secondary" data-act="close">關閉</button>
    </div>
  `;

  // 用 addEventListener 避免 onclick 引號跳脫問題
  p.querySelector('[data-act="speak"]')?.addEventListener('click', () => speakWord(word));
  p.querySelector('[data-act="close"]')?.addEventListener('click', closePopup);
  p.querySelector('[data-act="remove"]')?.addEventListener('click', () => removeWord(word));
  p.querySelector('[data-act="save"]')?.addEventListener('click', () => {
    saveWord(word, phonetic, meanings[0].pos, meanings[0].def, meanings[0].example || '', sourceSentence, sourceArticleId);
  });

  positionPopup(x, y);
};

window.positionPopup = function(x, y) {
  const p = popup();
  // 強制重新計算尺寸
  const w = p.offsetWidth;
  const h = p.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let px = x + 10;
  let py = y + 10;

  // 水平：超出右邊就靠左放
  if (px + w > vw - 12) px = Math.max(12, x - w - 10);
  if (px < 12) px = 12;

  // 垂直：優先放在點擊位置上方（如果空間夠），否則下方
  // 因為按鈕在彈窗底部，使用者點擊位置在中間時，下方常被遮住
  const spaceBelow = vh - y - 12;
  const spaceAbove = y - 12;
  if (h > spaceBelow && spaceAbove > spaceBelow) {
    // 上方空間比較大，放上方
    py = Math.max(12, y - h - 10);
  } else {
    py = Math.min(y + 10, vh - h - 12);
    if (py < 12) py = 12;
  }
  p.style.left = px + 'px';
  p.style.top = py + 'px';
};

window.closePopup = function() { popup().style.display = 'none'; };

window.saveWord = function(word, phonetic, pos, def, example, sourceSentence, sourceArticleId) {
  State.vocab[word] = {
    word, phonetic, pos, def, example,
    sourceSentence: sourceSentence || '',
    sourceArticleId: sourceArticleId || '',
    srs: { ef: 2.5, interval: 0, reps: 0, due: Date.now() },
    addedAt: Date.now()
  };
  save();
  highlightSavedWords();
  closePopup();
  toast(`已加入單字本：${word}`);
};

window.removeWord = function(word) {
  delete State.vocab[word];
  save();
  highlightSavedWords();
  closePopup();
  toast(`已移除：${word}`);
  if (document.getElementById('view-vocab')?.classList.contains('active')) renderVocab();
};

/* ---------- Speech synthesis ---------- */
window.voices = [];
window.loadVoices = function() {
  voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const sel = document.getElementById('voiceSelect');
  if (sel) {
    sel.innerHTML = voices.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
    if (State.selectedVoice && voices.find(v => v.name === State.selectedVoice)) sel.value = State.selectedVoice;
  }
};

window.speakWord = function(word) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  if (State.selectedVoice) {
    const v = voices.find(x => x.name === State.selectedVoice);
    if (v) u.voice = v;
  }
  u.rate = 0.9;
  speechSynthesis.speak(u);
};

/* ---------- Audio bar (article TTS + recording) ---------- */
window.initAudioBar = function() {
  document.getElementById('toggleZh').onclick = () => {
    const zh = document.getElementById('readerZh');
    zh.classList.toggle('visible');
    const btn = document.getElementById('toggleZh');
    btn.classList.toggle('active');
    btn.textContent = zh.classList.contains('visible') ? '隱藏中文' : '顯示中文';
  };

  document.getElementById('toggleAudio').onclick = () => {
    document.getElementById('audioBar').classList.toggle('visible');
    document.getElementById('toggleAudio').classList.toggle('active');
  };

  document.getElementById('toggleQuiz').onclick = () => {
    const q = document.getElementById('quizSection');
    q.classList.toggle('visible');
    document.getElementById('toggleQuiz').classList.toggle('active');
    if (q.classList.contains('visible')) q.scrollIntoView({behavior:'smooth', block:'start'});
  };

  document.getElementById('audioPlay').onclick = playArticle;

  document.querySelectorAll('.speed-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      State.speechRate = parseFloat(b.dataset.speed);
    });
  });

  setupRecording();
};

function playArticle() {
  if (!State.currentArticle) return;
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    document.getElementById('audioPlay').textContent = '▶';
    return;
  }
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    document.getElementById('audioPlay').textContent = '❚❚';
    return;
  }
  speechSynthesis.cancel();
  const paragraphs = State.currentArticle.en;
  let idx = 0;
  function speakNext() {
    if (idx >= paragraphs.length) {
      document.getElementById('audioPlay').textContent = '▶';
      return;
    }
    const u = new SpeechSynthesisUtterance(paragraphs[idx]);
    u.lang = 'en-US';
    if (State.selectedVoice) {
      const v = voices.find(x => x.name === State.selectedVoice);
      if (v) u.voice = v;
    }
    u.rate = State.speechRate;
    u.onboundary = e => {
      if (e.name !== 'word') return;
      const slice = paragraphs[idx].slice(0, e.charIndex);
      const wordIndex = (slice.match(/\S+/g) || []).length;
      let globalIdx = 0;
      for (let i = 0; i < idx; i++) globalIdx += (paragraphs[i].match(/\S+/g) || []).length;
      globalIdx += wordIndex;
      const wordSpans = document.querySelectorAll('.reader-text .word');
      wordSpans.forEach(s => s.classList.remove('speaking'));
      if (wordSpans[globalIdx]) {
        wordSpans[globalIdx].classList.add('speaking');
        wordSpans[globalIdx].scrollIntoView({behavior:'smooth', block:'center'});
      }
    };
    u.onend = () => {
      idx += 1;
      if (idx < paragraphs.length) speakNext();
      else {
        document.querySelectorAll('.reader-text .word').forEach(s => s.classList.remove('speaking'));
        document.getElementById('audioPlay').textContent = '▶';
      }
    };
    speechSynthesis.speak(u);
  }
  document.getElementById('audioPlay').textContent = '❚❚';
  speakNext();
}

let mediaRecorder = null;
let recordedChunks = [];
let recordedAudio = null;

function setupRecording() {
  document.getElementById('recordBtn').addEventListener('click', async () => {
    const btn = document.getElementById('recordBtn');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        recordedAudio = new Audio(URL.createObjectURL(blob));
        document.getElementById('audioPlayback').style.display = 'flex';
        stream.getTracks().forEach(t => t.stop());
        toast('錄音完成 · 點 ▶︎ 播放');
      };
      mediaRecorder.start();
      btn.classList.add('recording');
      btn.textContent = '◼';
      toast('開始錄音 · 再點一次停止');
    } catch (err) {
      toast('無法存取麥克風：請允許權限');
    }
  });

  document.getElementById('audioPlayback').addEventListener('click', () => {
    if (recordedAudio) {
      recordedAudio.currentTime = 0;
      recordedAudio.play();
    }
  });
}

/* 滑鼠點到 popup 之外 → 關閉 */
document.addEventListener('click', e => {
  const p = popup();
  if (!p) return;
  if (p.style.display !== 'block') return;
  if (!p.contains(e.target) && !e.target.classList.contains('word')) closePopup();
});

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();
