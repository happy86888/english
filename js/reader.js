/* ============================================================
   reader.js · 閱讀頁、單字查詢彈窗、TTS 朗讀、跟讀錄音
   ============================================================ */

/* ---------- Article reader ---------- */

let readerSentenceList = [];
let currentSentenceIndex = 0;

function splitIntoSentences(paragraph) {
  const text = String(paragraph || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const matches = text.match(/[^.!?]+(?:[.!?]+[\"’”)]*|$)/g) || [text];
  const cleaned = matches.map(x => x.trim()).filter(Boolean);
  return cleaned.length ? cleaned : [text];
}

function rebuildReaderSentences(article) {
  readerSentenceList = [];
  let sentenceIndex = 0;
  const paragraphsHTML = (article.en || []).map((paragraph, paragraphIndex) => {
    const sentences = splitIntoSentences(paragraph);
    const sentenceHTML = sentences.map(sentence => {
      const idx = sentenceIndex++;
      readerSentenceList.push({ text: sentence, paragraphIndex, index: idx });
      return `<span class="reader-sentence" data-sentence-index="${idx}">${tokenize(sentence)}</span>`;
    }).join(' ');
    return `<p>${sentenceHTML}</p>`;
  });
  currentSentenceIndex = 0;
  return paragraphsHTML.join('');
}

function clearSentenceHighlights() {
  document.querySelectorAll('.reader-sentence').forEach(s => s.classList.remove('active', 'queued'));
  document.querySelectorAll('.reader-text .word').forEach(s => s.classList.remove('speaking'));
}

function highlightCurrentSentence(scroll = false) {
  clearSentenceHighlights();
  const el = document.querySelector(`.reader-sentence[data-sentence-index="${currentSentenceIndex}"]`);
  if (el) {
    el.classList.add('active');
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  updateAudioSentenceStatus();
}

function updateAudioSentenceStatus() {
  const el = document.getElementById('audioSentenceStatus');
  if (!el) return;
  const total = readerSentenceList.length || 0;
  if (!total) {
    el.textContent = '尚無句子';
    return;
  }
  el.textContent = `第 ${Math.min(currentSentenceIndex + 1, total)} / ${total} 句`;
}

window.openArticle = function(id, highlightWord) {
  const article = getAllArticles().find(a => a.id === id);
  if (!article) return;
  // 存取控制檢查
  if (!Access.tryUse('article-' + id)) return;
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
  text.innerHTML = rebuildReaderSentences(article);
  updateAudioSentenceStatus();

  const zh = document.getElementById('readerZh');
  zh.innerHTML = article.zh.map(p => '<p>'+escapeHTML(p)+'</p>').join('');
  zh.classList.remove('visible');
  document.getElementById('toggleZh').textContent = '顯示中文';
  document.getElementById('toggleZh').classList.remove('active');

  const phrases = document.getElementById('readerPhrases');
  if (phrases) {
    const list = Array.isArray(article.usefulPhrases) ? article.usefulPhrases : [];
    phrases.innerHTML = list.length ? `
      <h3>Useful <em>phrases</em></h3>
      <div class="phrase-list">
        ${list.slice(0, 8).map(item => `
          <div class="phrase-card">
            <strong>${escapeHTML(item.phrase || '')}</strong>
            <p>${escapeHTML(item.zh || '')}</p>
            ${item.example ? `<small>${escapeHTML(item.example)}</small>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
  }

  stopArticleAudio();
  document.getElementById('audioBar').classList.remove('visible');
  document.getElementById('toggleAudio').classList.remove('active');
  document.getElementById('audioPlay').textContent = '▶';
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

/* ---------- TTS Engine: Google Cloud or Browser fallback ---------- */
window.voices = [];
window.loadVoices = function() {
  voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  const sel = document.getElementById('voiceSelect');
  if (sel) {
    const ranked = rankBrowserVoices(voices);
    sel.innerHTML = ranked.map(v =>
      `<option value="${v.name}"${v.name === State.selectedVoice ? ' selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');
    if (!State.selectedVoice && ranked.length > 0) {
      State.selectedVoice = ranked[0].name;
      Store.set('voice', ranked[0].name);
      sel.value = ranked[0].name;
    }
  }
};

function rankBrowserVoices(vs) {
  const preferred = ['Samantha', 'Google US English', 'Microsoft Aria Online', 'Microsoft Guy Online', 'Karen', 'Daniel'];
  return [...vs].sort((a, b) => {
    const ai = preferred.findIndex(p => a.name.startsWith(p));
    const bi = preferred.findIndex(p => b.name.startsWith(p));
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/* Google Cloud TTS — returns base64 MP3 */
const ttsCache = new Map();

async function googleTTS(text, rate) {
  rate = rate || 1.0;
  const cacheKey = text + '::' + State.ttsVoice + '::' + rate;
  if (ttsCache.has(cacheKey)) return ttsCache.get(cacheKey);

  const body = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: State.ttsVoice || 'en-US-Neural2-J',
      ssmlGender: State.ttsGender || 'MALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: rate,
      pitch: 0,
      effectsProfileId: ['headphone-class-device']
    }
  };

  const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(State.googleTtsKey);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Google TTS ' + res.status + ': ' + err.slice(0, 120));
  }
  const data = await res.json();
  ttsCache.set(cacheKey, data.audioContent);
  return data.audioContent;
}

/* ---------- speakWord (single word / short phrase) ---------- */
let currentWordAudio = null;

window.speakWord = async function(word) {
  speechSynthesis.cancel();
  if (currentWordAudio) { currentWordAudio.pause(); currentWordAudio = null; }

  if (State.ttsProvider === 'google' && State.googleTtsKey) {
    try {
      const b64 = await googleTTS(word, 0.85);
      const audio = new Audio('data:audio/mp3;base64,' + b64);
      currentWordAudio = audio;
      audio.play().catch(() => {});
      return;
    } catch (err) {
      console.warn('Google TTS word failed, using browser:', err.message);
    }
  }
  // Browser fallback
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.9;
  if (State.selectedVoice) {
    const v = voices.find(x => x.name === State.selectedVoice);
    if (v) u.voice = v;
  }
  speechSynthesis.speak(u);
};

/* ---------- Audio bar ---------- */
let articleAudioPlaying = false;
let articleAudioPaused = false;
let currentArticleAudio = null;
let autoContinueArticleAudio = true;

function stopArticleAudio() {
  articleAudioPlaying = false;
  articleAudioPaused = false;
  autoContinueArticleAudio = true;
  if (currentArticleAudio) {
    currentArticleAudio.pause();
    currentArticleAudio = null;
  }
  speechSynthesis.cancel();
  const btn = document.getElementById('audioPlay');
  if (btn) btn.textContent = '▶';
  clearSentenceHighlights();
  updateAudioSentenceStatus();
}

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
    updateAudioSentenceStatus();
  };

  document.getElementById('toggleQuiz').onclick = () => {
    const q = document.getElementById('quizSection');
    q.classList.toggle('visible');
    document.getElementById('toggleQuiz').classList.toggle('active');
    if (q.classList.contains('visible')) q.scrollIntoView({behavior:'smooth', block:'start'});
  };

  document.getElementById('audioPlay').onclick = handlePlayButton;
  document.getElementById('audioPrev')?.addEventListener('click', () => jumpSentence(-1, true));
  document.getElementById('audioRepeat')?.addEventListener('click', () => repeatCurrentSentence(true));
  document.getElementById('audioNext')?.addEventListener('click', () => jumpSentence(1, true));

  document.querySelectorAll('.speed-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      State.speechRate = parseFloat(b.dataset.speed);
      Store.set('speech_rate', String(State.speechRate));
    });
  });

  setupRecording();
};

function handlePlayButton() {
  if (!State.currentArticle || !readerSentenceList.length) return;
  const btn = document.getElementById('audioPlay');

  if (articleAudioPlaying && !articleAudioPaused) {
    if (State.ttsProvider === 'google' && State.googleTtsKey && currentArticleAudio) currentArticleAudio.pause();
    else if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
    articleAudioPaused = true;
    btn.textContent = '▶';
    return;
  }

  if (articleAudioPaused) {
    if (State.ttsProvider === 'google' && State.googleTtsKey && currentArticleAudio) currentArticleAudio.play().catch(() => {});
    else if (speechSynthesis.paused) speechSynthesis.resume();
    articleAudioPaused = false;
    articleAudioPlaying = true;
    btn.textContent = '❚❚';
    return;
  }

  autoContinueArticleAudio = true;
  playSentence(currentSentenceIndex, true);
}

function jumpSentence(delta, shouldPlay) {
  if (!readerSentenceList.length) return;
  const wasPlaying = articleAudioPlaying && !articleAudioPaused;
  stopPlaybackOnly();
  currentSentenceIndex = Math.max(0, Math.min(readerSentenceList.length - 1, currentSentenceIndex + delta));
  highlightCurrentSentence(true);
  if (shouldPlay && (wasPlaying || delta !== 0)) {
    autoContinueArticleAudio = true;
    playSentence(currentSentenceIndex, true);
  }
}

function repeatCurrentSentence(shouldPlay) {
  if (!readerSentenceList.length) return;
  stopPlaybackOnly();
  highlightCurrentSentence(true);
  if (shouldPlay) {
    autoContinueArticleAudio = false;
    playSentence(currentSentenceIndex, false);
  }
}

function stopPlaybackOnly() {
  articleAudioPlaying = false;
  articleAudioPaused = false;
  if (currentArticleAudio) {
    currentArticleAudio.pause();
    currentArticleAudio = null;
  }
  speechSynthesis.cancel();
  const btn = document.getElementById('audioPlay');
  if (btn) btn.textContent = '▶';
}

function playSentence(index, continueAfter) {
  if (!readerSentenceList.length) return;
  currentSentenceIndex = Math.max(0, Math.min(readerSentenceList.length - 1, index));
  autoContinueArticleAudio = continueAfter;
  if (State.ttsProvider === 'google' && State.googleTtsKey) playSentenceGoogle();
  else playSentenceBrowser();
}

async function playSentenceGoogle() {
  const sentence = readerSentenceList[currentSentenceIndex];
  if (!sentence) return;
  const btn = document.getElementById('audioPlay');
  btn.textContent = '…';
  btn.disabled = true;
  articleAudioPlaying = true;
  articleAudioPaused = false;
  highlightCurrentSentence(true);

  try {
    const b64 = await googleTTS(sentence.text, State.speechRate || 1.0);
    if (!articleAudioPlaying) { btn.disabled = false; btn.textContent = '▶'; return; }
    const audio = new Audio('data:audio/mp3;base64,' + b64);
    currentArticleAudio = audio;
    btn.disabled = false;
    btn.textContent = '❚❚';
    audio.onended = () => {
      if (!autoContinueArticleAudio || currentSentenceIndex >= readerSentenceList.length - 1) {
        articleAudioPlaying = false;
        btn.textContent = '▶';
        return;
      }
      currentSentenceIndex++;
      playSentenceGoogle();
    };
    audio.onerror = () => {
      articleAudioPlaying = false;
      btn.textContent = '▶';
    };
    audio.play().catch(() => {
      btn.textContent = '▶';
      articleAudioPlaying = false;
    });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '▶';
    articleAudioPlaying = false;
    toast('Google TTS 失敗，切換瀏覽器聲音');
    playSentenceBrowser();
  }
}

function playSentenceBrowser() {
  const sentence = readerSentenceList[currentSentenceIndex];
  if (!sentence) return;
  const btn = document.getElementById('audioPlay');
  stopPlaybackOnly();
  articleAudioPlaying = true;
  articleAudioPaused = false;
  btn.textContent = '❚❚';
  highlightCurrentSentence(true);

  const u = new SpeechSynthesisUtterance(sentence.text);
  u.lang = 'en-US';
  if (State.selectedVoice) {
    const v = voices.find(x => x.name === State.selectedVoice);
    if (v) u.voice = v;
  }
  u.rate = State.speechRate || 1.0;
  u.onboundary = e => {
    if (e.name !== 'word' && e.name !== 'sentence') return;
    const sentenceEl = document.querySelector(`.reader-sentence[data-sentence-index="${currentSentenceIndex}"]`);
    if (!sentenceEl || e.name !== 'word') return;
    const slice = sentence.text.slice(0, e.charIndex);
    const wordIndex = (slice.match(/\S+/g) || []).length;
    const spans = sentenceEl.querySelectorAll('.word');
    document.querySelectorAll('.reader-text .word').forEach(s => s.classList.remove('speaking'));
    if (spans[wordIndex]) spans[wordIndex].classList.add('speaking');
  };
  u.onend = () => {
    document.querySelectorAll('.reader-text .word').forEach(s => s.classList.remove('speaking'));
    if (!autoContinueArticleAudio || currentSentenceIndex >= readerSentenceList.length - 1) {
      articleAudioPlaying = false;
      articleAudioPaused = false;
      btn.textContent = '▶';
      return;
    }
    currentSentenceIndex++;
    playSentenceBrowser();
  };
  u.onerror = () => {
    articleAudioPlaying = false;
    articleAudioPaused = false;
    btn.textContent = '▶';
  };
  speechSynthesis.speak(u);
}

let mediaRecorder = null;
let recordedChunks = [];
let recordedAudio = null;

function setupRecording() {
  document.getElementById('recordBtn').addEventListener('click', async () => {
    const btn = document.getElementById('recordBtn');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop(); btn.classList.remove('recording'); btn.textContent = '🎙'; return;
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
      mediaRecorder.start(); btn.classList.add('recording'); btn.textContent = '◼';
      toast('開始錄音 · 再點一次停止');
    } catch { toast('無法存取麥克風：請允許權限'); }
  });

  document.getElementById('audioPlayback').addEventListener('click', () => {
    if (recordedAudio) { recordedAudio.currentTime = 0; recordedAudio.play(); }
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
