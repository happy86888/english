/* ============================================================
   main.js · 路由、Dashboard、Library、AI 產生、Settings、初始化
   ============================================================ */

/* ---------- View routing ---------- */
window.showView = function(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const v = document.getElementById('view-'+name);
  if (v) v.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  else if (name === 'library') renderLibrary();
  else if (name === 'vocab') renderVocab();
  else if (name === 'review') renderReview();
  else if (name === 'videos') renderVideos();
  else if (name === 'speaking') {
    document.getElementById('speakingContent').innerHTML = '';
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ---------- Theme ---------- */
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  Store.set('theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀' : '☾';
}

/* ---------- Dashboard ---------- */
window.renderDashboard = function() {
  const h = new Date().getHours();
  document.getElementById('greetTime').textContent = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';

  document.getElementById('statStreak').textContent = State.streak.count;
  document.getElementById('statArticles').textContent = Object.keys(State.completed).length;
  document.getElementById('statWords').textContent = Object.keys(State.vocab).length;
  document.getElementById('statDue').textContent = countDueWords();

  const aiRecent = State.aiArticles.slice(-2).reverse();
  const others = [...BUILTIN_ARTICLES, ...State.customArticles];
  const seed = new Date().getDate();
  const rotated = others.slice().sort((a, b) => ((a.id.charCodeAt(0) + seed) % others.length) - ((b.id.charCodeAt(0) + seed) % others.length));
  const today = [...aiRecent, ...rotated].slice(0, 3);

  const grid = document.getElementById('todayArticles');
  grid.innerHTML = today.map(articleCardHTML).join('');
  attachArticleClickHandlers(grid);
};

function articleCardHTML(a) {
  const completed = State.completed[a.id] ? 'completed' : '';
  const preview = a.en[0].slice(0, 100) + (a.en[0].length > 100 ? '...' : '');
  let sourceTag = '';
  if (a.id.startsWith('wiki-')) sourceTag = '<span class="ai-badge" style="background:#3a7bd5">Wiki</span>';
  else if (a.id.startsWith('ai-')) sourceTag = '<span class="ai-badge">AI</span>';
  return `
    <div class="article-card ${completed}" data-id="${a.id}">
      <div class="completion-mark">✓</div>
      <div class="article-meta">
        <span><span class="level-badge level-${a.level}">${a.level}</span>${sourceTag}</span>
        <span>${a.en.join(' ').split(/\s+/).length} words</span>
      </div>
      <h3 class="article-title">${escapeHTML(a.title)}</h3>
      <p class="article-title-zh">${escapeHTML(a.titleZh)}</p>
      <p class="article-preview">${escapeHTML(preview)}</p>
    </div>
  `;
}

function attachArticleClickHandlers(container) {
  container.querySelectorAll('.article-card').forEach(card => {
    card.addEventListener('click', () => openArticle(card.dataset.id));
  });
}

/* ---------- Library ---------- */
let currentLevelFilter = 'all';
window.renderLibrary = function() {
  const grid = document.getElementById('allArticles');
  let articles = getAllArticles().filter(a => currentLevelFilter === 'all' || a.level === currentLevelFilter);
  articles.sort((a, b) => {
    const ai_a = (a.id.startsWith('ai-') || a.id.startsWith('wiki-')) ? 1 : 0;
    const ai_b = (b.id.startsWith('ai-') || b.id.startsWith('wiki-')) ? 1 : 0;
    if (ai_a !== ai_b) return ai_b - ai_a;
    return 0;
  });
  grid.innerHTML = articles.map(articleCardHTML).join('') || '<p style="color:var(--ink-muted)">尚無短文</p>';
  attachArticleClickHandlers(grid);
};

/* ---------- AI Generate Article (modal) ---------- */
function openGenModal() {
  if (!checkApiKey()) return;
  const m = document.getElementById('genModal');
  m.classList.add('visible');
  document.getElementById('genForm').style.display = 'flex';
  document.getElementById('genProgress').classList.remove('visible');
  document.getElementById('genSubmitBtn').disabled = false;
  document.getElementById('genCancelBtn').disabled = false;
  document.getElementById('genStatus').textContent = '產生短文中…';
  document.getElementById('genStatus').style.color = 'var(--ink-muted)';
}

function setupGenerateModal() {
  const genModal = document.getElementById('genModal');

  document.getElementById('dashboardGenerateBtn').onclick = openGenModal;
  document.getElementById('libraryGenerateBtn').onclick = openGenModal;
  document.getElementById('genCancelBtn').onclick = () => genModal.classList.remove('visible');

  document.querySelectorAll('input[name="genSource"]').forEach(r => {
    r.addEventListener('change', () => {
      const isWiki = document.querySelector('input[name="genSource"]:checked').value === 'wiki';
      document.getElementById('genTopic').style.display = isWiki ? 'none' : '';
      document.getElementById('genTopicLabel').style.display = isWiki ? 'none' : '';
    });
  });

  document.getElementById('genSubmitBtn').onclick = async () => {
    const level = document.getElementById('genLevel').value;
    const topic = document.getElementById('genTopic').value.trim();
    const length = document.getElementById('genLength').value;
    const source = document.querySelector('input[name="genSource"]:checked').value;

    document.getElementById('genForm').style.display = 'none';
    document.getElementById('genProgress').classList.add('visible');
    document.getElementById('genSubmitBtn').disabled = true;
    document.getElementById('genCancelBtn').disabled = true;

    const wordCounts = { short: 100, medium: 180, long: 280 };
    const targetWords = wordCounts[length];
    const levelGuide = {
      A2: 'A2 (elementary). Use very common, everyday vocabulary. Simple short sentences. Present tense mostly. Avoid idioms.',
      B1: 'B1 (intermediate). Common vocabulary with some less frequent words. Mix of sentence lengths. All tenses allowed but no rare grammar.',
      B2: 'B2 (upper-intermediate). Richer vocabulary including some abstract terms. Varied sentence structure. Some idioms okay if context makes them clear.'
    };

    let prompt;
    let wikiSource = null;

    try {
      if (source === 'wiki') {
        document.getElementById('genStatus').textContent = '從維基百科隨機抓取中…';
        wikiSource = await fetchWikipediaSummary();
        document.getElementById('genStatus').textContent = `找到「${wikiSource.title}」，AI 改寫中…`;

        prompt = `I have a Wikipedia summary about "${wikiSource.title}". Rewrite it as an English reading passage for a self-study learner.

Original Wikipedia summary:
"""
${wikiSource.text}
"""

Requirements:
- Difficulty: ${levelGuide[level]}
- Length: about ${targetWords} words across 3-4 paragraphs.
- Keep the factual content faithful to the original, but rewrite for readability and language-learner clarity.
- Tone: warm and engaging, like a well-written magazine paragraph.

Then provide:
- A short English title (3-6 words).
- A Traditional Chinese title.
- Paragraph-by-paragraph Traditional Chinese translation.
- 3 comprehension multiple-choice questions in English (4 plausible options each, with the correct index 0-3).

Return strictly this JSON shape, nothing else:
{
  "title": "...",
  "titleZh": "...",
  "en": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "zh": ["段落 1", "段落 2", "段落 3"],
  "quiz": [
    { "q": "question?", "options": ["a","b","c","d"], "a": 1 },
    { "q": "question?", "options": ["a","b","c","d"], "a": 0 },
    { "q": "question?", "options": ["a","b","c","d"], "a": 2 }
  ]
}`;
      } else {
        document.getElementById('genStatus').textContent = '產生短文中…';
        const topicLine = topic ? `The article should be on this topic: "${topic}".` : 'Pick any interesting topic — daily life, travel, psychology, science, relationships, work, art — that would engage a curious adult learner.';

        prompt = `Write an English reading passage for self-study, plus a Traditional Chinese translation and a comprehension quiz.

Requirements:
- Difficulty: ${levelGuide[level]}
- Length: about ${targetWords} words across 3-4 paragraphs.
- ${topicLine}
- Tone: thoughtful, slightly literary, engaging — not textbook-dry.
- Show a small specific scene or insight. Avoid clichéd "AI sample text" feel.

Then provide:
- A short English title (3-6 words) and Traditional Chinese title.
- Paragraph-by-paragraph Traditional Chinese translation.
- 3 comprehension multiple-choice questions in English (4 plausible options each).

Return strictly this JSON shape, nothing else:
{
  "title": "...",
  "titleZh": "...",
  "en": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "zh": ["段落 1", "段落 2", "段落 3"],
  "quiz": [
    { "q": "question?", "options": ["a","b","c","d"], "a": 1 },
    { "q": "question?", "options": ["a","b","c","d"], "a": 0 },
    { "q": "question?", "options": ["a","b","c","d"], "a": 2 }
  ]
}`;
      }

      const result = await callAI(prompt);
      if (!result.title || !result.en || !result.zh) throw new Error('回傳格式錯誤');
      const article = {
        id: (source === 'wiki' ? 'wiki-' : 'ai-') + Date.now(),
        level,
        title: result.title,
        titleZh: result.titleZh || result.title,
        en: result.en,
        zh: result.zh,
        quiz: result.quiz || [],
        sourceUrl: wikiSource?.url || null
      };
      State.aiArticles.push(article);
      save();
      genModal.classList.remove('visible');
      toast(source === 'wiki' ? '✦ 維基百科短文已產生' : '✦ 短文已產生');
      openArticle(article.id);
    } catch (err) {
      document.getElementById('genStatus').textContent = '失敗：' + err.message;
      document.getElementById('genStatus').style.color = 'var(--error)';
      setTimeout(() => {
        document.getElementById('genForm').style.display = 'flex';
        document.getElementById('genProgress').classList.remove('visible');
        document.getElementById('genStatus').style.color = 'var(--ink-muted)';
        document.getElementById('genStatus').textContent = '產生短文中…';
        document.getElementById('genSubmitBtn').disabled = false;
        document.getElementById('genCancelBtn').disabled = false;
      }, 2800);
    }
  };
}

/* ---------- AI Personalized Review Story ---------- */
function setupAiReviewModal() {
  const aiReviewModal = document.getElementById('aiReviewModal');
  document.getElementById('aiReviewBtn').onclick = () => {
    if (!checkApiKey()) return;
    if (Object.keys(State.vocab).length < 3) {
      toast('至少需要 3 個收藏的單字才能產生');
      return;
    }
    aiReviewModal.classList.add('visible');
    document.getElementById('aiReviewForm').style.display = 'flex';
    document.getElementById('aiReviewProgress').classList.remove('visible');
    document.getElementById('aiReviewSubmitBtn').disabled = false;
    document.getElementById('aiReviewCancelBtn').disabled = false;
  };
  document.getElementById('aiReviewCancelBtn').onclick = () => aiReviewModal.classList.remove('visible');

  document.getElementById('aiReviewSubmitBtn').onclick = async () => {
    const choice = document.getElementById('aiReviewCount').value;
    let pickedWords;
    if (choice === 'due') {
      pickedWords = Object.values(State.vocab).filter(w => w.srs.due <= Date.now());
    } else {
      const n = parseInt(choice);
      pickedWords = Object.values(State.vocab).sort((a,b) => b.addedAt - a.addedAt).slice(0, n);
    }
    if (pickedWords.length === 0) { toast('沒有適合的單字'); return; }

    document.getElementById('aiReviewForm').style.display = 'none';
    document.getElementById('aiReviewProgress').classList.add('visible');
    document.getElementById('aiReviewSubmitBtn').disabled = true;
    document.getElementById('aiReviewCancelBtn').disabled = true;

    const wordList = pickedWords.map(w => `- ${w.word} (${w.pos}): ${w.def}`).join('\n');
    const prompt = `Write a short, engaging English story (about 150-200 words, B1 level) that naturally uses ALL of the following words. Each word must appear at least once, in a context that makes its meaning clear.

Words to use:
${wordList}

Requirements:
- The story should feel cohesive, not a forced word-list demonstration.
- Tone: thoughtful and a bit literary.
- 3-4 paragraphs.
- Then provide a Traditional Chinese translation paragraph by paragraph.
- Then 3 comprehension multiple-choice questions in English (4 options each).

Return strictly this JSON, nothing else:
{
  "title": "...",
  "titleZh": "...",
  "en": ["paragraph 1", "paragraph 2"],
  "zh": ["段落 1", "段落 2"],
  "quiz": [
    { "q": "...", "options": ["a","b","c","d"], "a": 0 },
    { "q": "...", "options": ["a","b","c","d"], "a": 1 },
    { "q": "...", "options": ["a","b","c","d"], "a": 2 }
  ]
}`;

    try {
      const result = await callAI(prompt);
      const article = {
        id: 'ai-review-' + Date.now(),
        level: 'B1',
        title: result.title || 'Personal Review Story',
        titleZh: result.titleZh || '個人化複習短文',
        en: result.en,
        zh: result.zh,
        quiz: result.quiz || []
      };
      State.aiArticles.push(article);
      save();
      aiReviewModal.classList.remove('visible');
      toast('✦ 複習短文已產生');
      openArticle(article.id);
    } catch (err) {
      toast('失敗：' + err.message);
      document.getElementById('aiReviewForm').style.display = 'flex';
      document.getElementById('aiReviewProgress').classList.remove('visible');
      document.getElementById('aiReviewSubmitBtn').disabled = false;
      document.getElementById('aiReviewCancelBtn').disabled = false;
    }
  };
}

/* ---------- Settings: API key ---------- */
function refreshApiStatus() {
  document.getElementById('apiStatus').classList.toggle('connected', !!State.apiKey);
  document.getElementById('apiKeyInput').value = State.apiKey ? '••••••••••••••' + State.apiKey.slice(-4) : '';
}

function refreshGroqStatus() {
  document.getElementById('groqStatus').classList.toggle('connected', !!State.groqKey);
  document.getElementById('groqKeyInput').value = State.groqKey ? '••••••••••••••' + State.groqKey.slice(-4) : '';
}

function refreshYtApiStatus() {
  document.getElementById('ytApiStatus').classList.toggle('connected', !!State.youtubeKey);
  document.getElementById('ytApiKeyInput').value = State.youtubeKey ? '••••••••••••••' + State.youtubeKey.slice(-4) : '';
}

function setupSettings() {
  refreshApiStatus();
  refreshGroqStatus();

  // AI provider selector
  document.getElementById('aiProviderSelect').value = State.aiProvider || 'gemini';
  document.getElementById('aiProviderSelect').addEventListener('change', e => {
    State.aiProvider = e.target.value;
    Store.set('ai_provider', e.target.value);
    const name = e.target.value === 'groq' ? 'Groq (Llama)' : 'Google Gemini';
    toast(`AI 提供者已切換為 ${name}`);
  });

  // Gemini key
  document.getElementById('apiKeyInput').addEventListener('focus', e => {
    if (State.apiKey && e.target.value.startsWith('•')) e.target.value = '';
  });

  document.getElementById('saveApiKeyBtn').onclick = () => {
    const v = document.getElementById('apiKeyInput').value.trim();
    if (v.startsWith('•')) return;
    if (v && !v.startsWith('AIza')) {
      toast('Gemini API key 通常以 AIza 開頭');
      return;
    }
    State.apiKey = v;
    Store.set('api_key', v);
    refreshApiStatus();
    toast(v ? '已儲存 Gemini key' : '已清除 Gemini key');
  };

  document.getElementById('modelSelect').value = State.model;
  document.getElementById('modelSelect').addEventListener('change', e => {
    State.model = e.target.value;
    Store.set('model', e.target.value);
  });

  // Groq key
  document.getElementById('groqKeyInput').addEventListener('focus', e => {
    if (State.groqKey && e.target.value.startsWith('•')) e.target.value = '';
  });

  document.getElementById('saveGroqKeyBtn').onclick = () => {
    const v = document.getElementById('groqKeyInput').value.trim();
    if (v.startsWith('•')) return;
    if (v && !v.startsWith('gsk_')) {
      toast('Groq API key 通常以 gsk_ 開頭');
      return;
    }
    State.groqKey = v;
    Store.set('groq_key', v);
    refreshGroqStatus();
    toast(v ? '已儲存 Groq key' : '已清除 Groq key');
  };

  document.getElementById('groqModelSelect').value = State.groqModel;
  document.getElementById('groqModelSelect').addEventListener('change', e => {
    State.groqModel = e.target.value;
    Store.set('groq_model', e.target.value);
  });

  /* YouTube API key setup */
  refreshYtApiStatus();

  document.getElementById('ytApiKeyInput').addEventListener('focus', e => {
    if (State.youtubeKey && e.target.value.startsWith('•')) e.target.value = '';
  });

  document.getElementById('saveYtKeyBtn').onclick = () => {
    const v = document.getElementById('ytApiKeyInput').value.trim();
    if (v.startsWith('•')) return;
    State.youtubeKey = v;
    Store.set('youtube_key', v);
    refreshYtApiStatus();
    toast(v ? '已儲存 YouTube key' : '已清除 YouTube key');
  };

  // Level selector for YouTube search
  document.getElementById('ytLevelSelect').value = State.ytLevel;
  document.getElementById('ytLevelSelect').addEventListener('change', e => {
    State.ytLevel = e.target.value;
    Store.set('yt_level', e.target.value);
    // 清掉舊快取，下次點「每日新鮮」會重抓
    State.ytCachedVideos = { date: null, videos: [] };
    Store.set('yt_cached', State.ytCachedVideos);
    toast('程度已切換，下次「每日新鮮」會重抓');
  });

  // Keywords inputs
  document.getElementById('ytKwA2').value = State.ytSearchKeywords.A2 || '';
  document.getElementById('ytKwB1').value = State.ytSearchKeywords.B1 || '';
  document.getElementById('ytKwB2').value = State.ytSearchKeywords.B2 || '';

  document.getElementById('saveYtKwBtn').onclick = () => {
    State.ytSearchKeywords = {
      A2: document.getElementById('ytKwA2').value.trim() || 'easy English for beginners simple lessons',
      B1: document.getElementById('ytKwB1').value.trim() || 'English vocabulary intermediate learn English conversation',
      B2: document.getElementById('ytKwB2').value.trim() || 'TED talk Vox explained English documentary'
    };
    Store.set('yt_keywords', State.ytSearchKeywords);
    State.ytCachedVideos = { date: null, videos: [] };
    Store.set('yt_cached', State.ytCachedVideos);
    toast('已儲存搜尋關鍵字');
  };

  document.getElementById('voiceSelect').addEventListener('change', e => {
    State.selectedVoice = e.target.value;
    Store.set('voice', e.target.value);
  });

  // Backup
  document.getElementById('exportBtn').onclick = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 3,
      vocab: State.vocab,
      customArticles: State.customArticles,
      aiArticles: State.aiArticles,
      customVideos: State.customVideos || [],
      completed: State.completed,
      streak: State.streak
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dawn-reader-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已匯出備份');
  };

  document.getElementById('importBtn').onclick = () => document.getElementById('importInput').click();
  document.getElementById('importInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.vocab) State.vocab = { ...State.vocab, ...data.vocab };
        if (data.customArticles) State.customArticles = [...State.customArticles, ...data.customArticles];
        if (data.aiArticles) State.aiArticles = [...State.aiArticles, ...data.aiArticles];
        if (data.customVideos) State.customVideos = [...(State.customVideos || []), ...data.customVideos];
        if (data.completed) State.completed = { ...State.completed, ...data.completed };
        if (data.streak) State.streak = data.streak;
        save();
        toast('已匯入資料');
        renderDashboard();
      } catch {
        toast('檔案格式錯誤');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('clearBtn').onclick = () => {
    if (confirm('確定要清除所有資料嗎？包括所有 API key、單字本、AI 短文、自訂影片。此操作無法復原。')) {
      Store.clearAll();
      State.vocab = {};
      State.customArticles = [];
      State.aiArticles = [];
      State.customVideos = [];
      State.completed = {};
      State.streak = { count: 0, lastDate: null };
      State.apiKey = '';
      State.groqKey = '';
      State.youtubeKey = '';
      State.ytCachedVideos = { date: null, videos: [] };
      refreshApiStatus();
      refreshGroqStatus();
      refreshYtApiStatus();
      toast('已清除所有資料');
      renderDashboard();
    }
  };
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  setTheme(Store.get('theme', 'light'));
  document.getElementById('themeToggle').onclick = () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  };

  // Nav
  document.querySelectorAll('[data-view]').forEach(b => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });

  // Library level filters
  document.querySelectorAll('[data-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-level]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLevelFilter = btn.dataset.level;
      renderLibrary();
    });
  });

  initAudioBar();
  initVocabControls();
  initVideos();
  initSpeaking();
  setupGenerateModal();
  setupAiReviewModal();
  setupSettings();

  renderDashboard();
});
