/* ============================================================
   api.js · AI 呼叫，支援 Gemini、Groq、OpenRouter 多提供者
   API key 從不離開使用者的瀏覽器。
   ============================================================ */

const AI_PROVIDERS = {
  gemini: { name: 'Google Gemini', keyField: 'apiKey', inputId: 'apiKeyInput' },
  groq: { name: 'Groq', keyField: 'groqKey', inputId: 'groqKeyInput' },
  openrouter: { name: 'OpenRouter', keyField: 'openrouterKey', inputId: 'openrouterKeyInput' }
};

window.checkApiKey = function() {
  const provider = State.aiProvider || 'gemini';
  const meta = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
  const hasKey = !!State[meta.keyField];
  if (!hasKey) {
    toast(`請先到「設定」填入 ${meta.name} API key`);
    showView('settings');
    setTimeout(() => {
      const input = document.getElementById(meta.inputId);
      if (input) input.focus();
    }, 400);
    return false;
  }
  return true;
};

window.callAI = async function(prompt, opts = {}) {
  const provider = State.aiProvider || 'gemini';
  if (provider === 'groq') return callGroq(prompt, opts);
  if (provider === 'openrouter') return callOpenRouter(prompt, opts);
  return callGemini(prompt, opts);
};

/* ---------- Gemini ---------- */
async function callGemini(prompt, opts) {
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
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 沒有回傳內容');
  if (expectJSON) {
    try { return JSON.parse(text); }
    catch { throw new Error('AI 回傳格式錯誤'); }
  }
  return text;
}

/* ---------- Groq (OpenAI-compatible) ---------- */
async function callGroq(prompt, opts) {
  const expectJSON = opts.json !== false;
  const systemText = opts.systemInstruction
    || 'You are an English teacher creating learning content for a Mandarin-speaking learner in Taiwan. Use Traditional Chinese (繁體中文 / 台灣用語) for Chinese translations. When asked for JSON, respond ONLY with valid JSON, no surrounding prose or markdown fences.';

  const body = {
    model: State.groqModel || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: prompt }
    ],
    temperature: opts.temperature ?? 0.85
  };
  if (expectJSON) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${State.groqKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq 沒有回傳內容');

  if (expectJSON) {
    // Llama 有時會包 ```json ... ``` 或多餘前後綴，先清乾淨再 parse
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    // 如果還有前後綴文字，找出第一個 { 到最後一個 }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > 0 || (lastBrace > 0 && lastBrace < text.length - 1)) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
    try { return JSON.parse(text); }
    catch (err) { throw new Error('Groq JSON 解析失敗：' + err.message.slice(0, 100)); }
  }
  return text;
}

/* ---------- OpenRouter (OpenAI-compatible aggregator) ---------- */
async function callOpenRouter(prompt, opts) {
  const expectJSON = opts.json !== false;
  const systemText = opts.systemInstruction
    || 'You are an expert English reading-content editor for Mandarin-speaking adult learners in Taiwan. Use Traditional Chinese (繁體中文 / 台灣用語) for Chinese translations. When asked for JSON, respond ONLY with valid JSON, no surrounding prose or markdown fences.';

  const body = {
    model: State.openrouterModel || '~anthropic/claude-sonnet-latest',
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: prompt }
    ],
    temperature: opts.temperature ?? 0.95,
    top_p: opts.top_p ?? 0.92,
    max_tokens: opts.max_tokens ?? 2200
  };
  if (expectJSON) {
    body.response_format = { type: 'json_object' };
  }

  // Fetch headers can only contain ISO-8859-1 / ASCII-safe characters.
  // document.title may include Chinese characters, which causes:
  // "String contains non ISO-8859-1 code point" before the request is sent.
  const safeOpenRouterKey = String(State.openrouterKey || '').trim();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeOpenRouterKey}`,
    'X-Title': 'Dawn Reader'
  };
  if (location.origin && location.origin !== 'null') headers['HTTP-Referer'] = location.origin;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter 沒有回傳內容');

  if (expectJSON) {
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > 0 || (lastBrace > 0 && lastBrace < text.length - 1)) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
    try { return JSON.parse(text); }
    catch (err) { throw new Error('OpenRouter JSON 解析失敗：' + err.message.slice(0, 100)); }
  }
  return text;
}

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
