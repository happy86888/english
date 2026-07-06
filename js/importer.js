/* ============================================================
   importer.js · 匯入網頁文章 / 貼上文章正文，轉成閱讀教材
   ============================================================ */

function normalizeArticleUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return 'https://' + raw;
}

function jinaReaderUrl(url) {
  // Reader API: prepend https://r.jina.ai/ to the original URL.
  return 'https://r.jina.ai/' + url;
}

function cleanImportedText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/^\s*(Title|URL|Markdown Content):\s*/gim, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]+\]\([^)]*\)/g, m => m.replace(/^\[|\]\([^)]*\)$/g, ''))
    .replace(/#{1,6}\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function guessTitleFromImportedText(text, url) {
  const lines = String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
  const titleLine = lines.find(line => line.length >= 8 && line.length <= 90 && !/^https?:/i.test(line));
  if (titleLine) return titleLine.replace(/^title:\s*/i, '').trim();
  try {
    const u = new URL(url);
    return u.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || u.hostname;
  } catch {
    return 'Imported Article';
  }
}

async function fetchArticleViaReader(url) {
  const readerUrl = jinaReaderUrl(url);
  const res = await fetch(readerUrl, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' }
  });
  if (!res.ok) throw new Error('Reader API 讀取失敗：HTTP ' + res.status);
  const text = await res.text();
  const cleaned = cleanImportedText(text);
  if (cleaned.length < 200) throw new Error('抓到的文章內容太短，請改貼正文');
  return cleaned;
}

function trimForAI(text, maxChars = 18000) {
  const cleaned = cleanImportedText(text);
  if (cleaned.length <= maxChars) return cleaned;
  const head = cleaned.slice(0, Math.floor(maxChars * 0.65));
  const tail = cleaned.slice(-Math.floor(maxChars * 0.25));
  return head + '\n\n[... middle section shortened for processing ...]\n\n' + tail;
}

function getImportLevelGuide(level) {
  const guides = {
    A2: 'A2. Use short sentences and common everyday vocabulary. Keep the article easy but not childish.',
    B1: 'B1. Use natural adult English with clear sentence structure and some useful new words.',
    B2: 'B2. Keep richer vocabulary and more of the original nuance, but still make it suitable for self-study.'
  };
  return guides[level] || guides.B1;
}

function buildImportedArticlePrompt({ title, sourceUrl, text, level, mode }) {
  const modeGuide = mode === 'faithful'
    ? 'Stay close to the source article’s logic and order. Condense only when necessary. The English reading passage should preserve the author’s main argument and important examples.'
    : 'Turn the source into a focused English-learning article. Keep the core idea, remove repetitive details, and make it easier to read aloud and study.';

  return `You are creating a reading lesson from a web article for a Traditional Chinese speaker learning English.

Source title: ${title}
Source URL: ${sourceUrl || 'N/A'}
Target level: ${getImportLevelGuide(level)}
Mode: ${modeGuide}

Source article text:
"""
${trimForAI(text)}
"""

Create a clean learning version.
Requirements:
- Write 4 to 7 English paragraphs.
- Preserve the main ideas, specific examples, and useful wording from the source.
- Do not invent facts that are not in the source.
- Make every paragraph readable aloud as a standalone unit.
- Provide a paragraph-by-paragraph Traditional Chinese translation.
- Add 5 useful phrases from the article with Traditional Chinese explanations.
- Add 3 comprehension questions in English with 4 options each.

Return strictly this JSON shape and nothing else:
{
  "title": "English title, 3-9 words",
  "titleZh": "Traditional Chinese title",
  "en": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4"],
  "zh": ["段落 1 中文翻譯", "段落 2 中文翻譯", "段落 3 中文翻譯", "段落 4 中文翻譯"],
  "usefulPhrases": [
    { "phrase": "...", "zh": "...", "example": "..." }
  ],
  "quiz": [
    { "q": "question?", "options": ["a", "b", "c", "d"], "a": 1 },
    { "q": "question?", "options": ["a", "b", "c", "d"], "a": 0 },
    { "q": "question?", "options": ["a", "b", "c", "d"], "a": 2 }
  ]
}`;
}

function setImportBusy(isBusy, message) {
  const form = document.getElementById('articleImportForm');
  const progress = document.getElementById('articleImportProgress');
  const status = document.getElementById('articleImportStatus');
  const submit = document.getElementById('articleImportSubmitBtn');
  const cancel = document.getElementById('articleImportCancelBtn');
  if (!form || !progress || !status) return;
  form.style.display = isBusy ? 'none' : 'flex';
  progress.classList.toggle('visible', isBusy);
  if (message) status.textContent = message;
  if (submit) submit.disabled = isBusy;
  if (cancel) cancel.disabled = isBusy;
}

function renderUsefulPhrasesToast(article) {
  if (!article.usefulPhrases || !article.usefulPhrases.length) return;
  setTimeout(() => toast('已匯入文章：可顯示中文、朗讀、做測驗'), 300);
}

window.setupArticleImporter = function() {
  const openBtn = document.getElementById('importArticleBtn');
  const modal = document.getElementById('articleImportModal');
  if (!openBtn || !modal) return;

  openBtn.onclick = () => {
    if (!checkApiKey()) return;
    modal.classList.add('visible');
    setImportBusy(false);
    document.getElementById('articleImportStatus').style.color = 'var(--ink-muted)';
  };

  document.getElementById('articleImportCancelBtn').onclick = () => modal.classList.remove('visible');

  document.getElementById('articleImportSubmitBtn').onclick = async () => {
    if (!checkApiKey()) return;
    const rawUrl = document.getElementById('articleImportUrl').value.trim();
    const manualText = document.getElementById('articleImportText').value.trim();
    const sourceUrl = normalizeArticleUrl(rawUrl);
    const level = document.getElementById('articleImportLevel').value;
    const mode = document.getElementById('articleImportMode').value;

    if (!sourceUrl && manualText.length < 200) {
      toast('請貼上文章網址，或至少貼上 200 字以上的正文');
      return;
    }

    setImportBusy(true, sourceUrl ? '讀取網頁文章中…' : '整理貼上的文章中…');
    document.getElementById('articleImportStatus').style.color = 'var(--ink-muted)';

    try {
      let articleText = manualText;
      if (!articleText && sourceUrl) {
        try {
          articleText = await fetchArticleViaReader(sourceUrl);
        } catch (fetchErr) {
          throw new Error(fetchErr.message + '。若這個網站阻擋外部讀取，請把正文貼到輸入框再試一次。');
        }
      }

      const title = guessTitleFromImportedText(articleText, sourceUrl);
      document.getElementById('articleImportStatus').textContent = 'AI 正在翻譯並製作學習版…';
      const prompt = buildImportedArticlePrompt({ title, sourceUrl, text: articleText, level, mode });
      const result = await callAI(prompt);
      if (!result.title || !Array.isArray(result.en) || !Array.isArray(result.zh)) {
        throw new Error('AI 回傳格式錯誤，請再試一次');
      }

      const article = {
        id: 'import-' + Date.now(),
        level,
        title: result.title || title,
        titleZh: result.titleZh || result.title || title,
        en: result.en,
        zh: result.zh,
        quiz: result.quiz || [],
        usefulPhrases: result.usefulPhrases || [],
        sourceUrl: sourceUrl || null,
        importedAt: Date.now(),
        sourceType: 'web-article'
      };
      State.aiArticles.push(article);
      save();
      modal.classList.remove('visible');
      renderLibrary();
      renderDashboard();
      openArticle(article.id);
      renderUsefulPhrasesToast(article);
    } catch (err) {
      const status = document.getElementById('articleImportStatus');
      status.textContent = '失敗：' + err.message;
      status.style.color = 'var(--error)';
      setTimeout(() => {
        setImportBusy(false);
        status.style.color = 'var(--ink-muted)';
      }, 3600);
    }
  };
};

// Main 可能已經載入完成，也可能還沒載入；兩種情況都支援。
document.addEventListener('DOMContentLoaded', () => {
  if (window.setupArticleImporter) window.setupArticleImporter();
});
