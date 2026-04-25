/* ============================================================
   api.js · Google Gemini API 呼叫
   API key 從不離開使用者的瀏覽器。
   ============================================================ */

window.checkApiKey = function() {
  if (!State.apiKey) {
    toast('請先到「設定」填入 Gemini API key');
    showView('settings');
    setTimeout(() => {
      const input = document.getElementById('apiKeyInput');
      if (input) input.focus();
    }, 400);
    return false;
  }
  return true;
};

window.callAI = async function(prompt, opts = {}) {
  // opts.json: false 表示要純文字（預設 true，回傳 JSON）
  // opts.systemInstruction: 可選的 system 提示
  // opts.temperature: 預設 0.85
  const expectJSON = opts.json !== false;
  const systemText = opts.systemInstruction
    || 'You are an English teacher creating learning content for a Mandarin-speaking learner in Taiwan. Use Traditional Chinese (繁體中文 / 台灣用語) for Chinese translations.';

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemText }] },
    generationConfig: {
      temperature: opts.temperature ?? 0.85,
    }
  };
  if (expectJSON) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${State.model}:generateContent?key=${encodeURIComponent(State.apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI 沒有回傳內容');
  if (expectJSON) {
    try { return JSON.parse(text); }
    catch { throw new Error('AI 回傳格式錯誤'); }
  }
  return text;
};

/* ---------- Wikipedia 隨機摘要（用於 AI 改寫的素材） ---------- */
window.fetchWikipediaSummary = async function() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
    const data = await res.json();
    const extract = (data.extract || '').trim();
    if (extract.length >= 200 && extract.length <= 2000 && data.type === 'standard') {
      return {
        title: data.title,
        url: data.content_urls?.desktop?.page,
        text: extract
      };
    }
  }
  throw new Error('找不到合適的維基百科文章，請再試一次');
};
