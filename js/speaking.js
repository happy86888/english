/* ============================================================
   speaking.js · 口說練習：跟讀 / 個人話題 / 情境對話
   依賴 Web Speech API SpeechRecognition (Chrome/Edge/Safari)
   ============================================================ */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let dialogHistory = [];
let dialogScenario = null;

window.initSpeaking = function() {
  document.querySelectorAll('[data-mode]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const mode = card.dataset.mode;
      if (mode === 'shadow') renderShadowMode();
      else if (mode === 'topic') renderTopicMode();
      else if (mode === 'dialog') renderDialogMode();
    });
  });
};

function noSpeechWarningHTML() {
  return `<div class="no-speech-warning">⚠ 你的瀏覽器不支援語音辨識。請改用 Chrome、Edge、Safari，或手機 iOS Safari / Android Chrome。</div>`;
}

/* ----- Mode 1: 跟讀 (Shadow) ----- */
function renderShadowMode() {
  const sentence = SHADOW_SENTENCES[Math.floor(Math.random() * SHADOW_SENTENCES.length)];
  const container = document.getElementById('speakingContent');
  container.innerHTML = `
    <div class="speaking-panel">
      <h3 style="font-family:'Fraunces',serif; font-size:1.3rem; margin-bottom:0.3rem">跟讀練習</h3>
      <p style="color:var(--ink-muted); font-size:0.9rem; margin-bottom:1.2rem">點 ▶ 播放，再點 🎙 錄下你的版本。</p>
      <div class="shadow-sentence" id="shadowSentenceText">${escapeHTML(sentence.en)}</div>
      <div class="shadow-zh">${escapeHTML(sentence.zh)}</div>
      <div class="shadow-controls">
        <button class="action-btn" id="shadowPlayBtn">▶ 聽範例</button>
        <button class="action-btn secondary" id="shadowSlowBtn">▶ 慢速</button>
        <button class="action-btn secondary" id="shadowNextBtn">下一句 →</button>
      </div>
      <button class="mic-btn" id="shadowMicBtn" title="按一下開始錄音 / 再按一下停止">🎙</button>
      <div class="mic-status" id="shadowMicStatus">準備就緒</div>
      <div id="shadowPlayback" style="display:none">
        <div style="display:flex; gap:0.6rem; justify-content:center; margin-top:0.5rem">
          <button class="action-btn secondary" id="shadowReplayMine">▶ 我的錄音</button>
          <button class="action-btn secondary" id="shadowReplayAI">▶ 範例</button>
        </div>
      </div>
    </div>
  `;

  const speakSentence = (rate) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sentence.en);
    u.lang = 'en-US';
    u.rate = rate;
    if (State.selectedVoice) {
      const v = voices.find(x => x.name === State.selectedVoice);
      if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
  };

  document.getElementById('shadowPlayBtn').onclick = () => speakSentence(0.95);
  document.getElementById('shadowSlowBtn').onclick = () => speakSentence(0.65);
  document.getElementById('shadowNextBtn').onclick = renderShadowMode;
  document.getElementById('shadowReplayAI').onclick = () => speakSentence(0.95);

  let shadowMR = null;
  let shadowChunks = [];
  let shadowAudio = null;

  document.getElementById('shadowMicBtn').addEventListener('click', async () => {
    const btn = document.getElementById('shadowMicBtn');
    const status = document.getElementById('shadowMicStatus');
    if (shadowMR && shadowMR.state === 'recording') {
      shadowMR.stop();
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      status.textContent = '錄音完成，點下方播放';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      shadowChunks = [];
      shadowMR = new MediaRecorder(stream);
      shadowMR.ondataavailable = e => shadowChunks.push(e.data);
      shadowMR.onstop = () => {
        const blob = new Blob(shadowChunks, { type: 'audio/webm' });
        shadowAudio = new Audio(URL.createObjectURL(blob));
        document.getElementById('shadowPlayback').style.display = 'block';
        stream.getTracks().forEach(t => t.stop());
      };
      shadowMR.start();
      btn.classList.add('recording');
      btn.textContent = '◼';
      status.textContent = '錄音中… 再點一次停止';
    } catch {
      status.textContent = '無法存取麥克風';
    }
  });

  document.getElementById('shadowReplayMine').addEventListener('click', () => {
    if (shadowAudio) { shadowAudio.currentTime = 0; shadowAudio.play(); }
  });
}

/* ----- Mode 2: 個人話題 (Topic) ----- */
function renderTopicMode() {
  if (!SR) {
    document.getElementById('speakingContent').innerHTML = `<div class="speaking-panel">${noSpeechWarningHTML()}</div>`;
    return;
  }
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const container = document.getElementById('speakingContent');
  container.innerHTML = `
    <div class="speaking-panel">
      <h3 style="font-family:'Fraunces',serif; font-size:1.3rem; margin-bottom:0.3rem">個人話題</h3>
      <p style="color:var(--ink-muted); font-size:0.9rem; margin-bottom:1.2rem">按下麥克風按鈕回答，AI 會即時轉文字並給回饋。</p>
      <div class="speech-bubble ai" id="topicQ">
        <strong>Q:</strong> ${escapeHTML(topic.q)}
        <small>${escapeHTML(topic.zh)}</small>
      </div>
      <button class="mic-btn" id="topicMicBtn">🎙</button>
      <div class="mic-status" id="topicMicStatus">按一下開始說話</div>
      <div id="topicTranscript"></div>
      <div id="topicFeedback"></div>
      <div style="text-align:center; margin-top:1rem">
        <button class="action-btn secondary" id="topicNextBtn">下一題 →</button>
      </div>
    </div>
  `;

  document.getElementById('topicNextBtn').onclick = renderTopicMode;

  let isRecording = false;
  let finalTranscript = '';

  document.getElementById('topicMicBtn').addEventListener('click', () => {
    const btn = document.getElementById('topicMicBtn');
    const status = document.getElementById('topicMicStatus');
    if (isRecording) { recognition.stop(); return; }

    finalTranscript = '';
    document.getElementById('topicTranscript').innerHTML = '';
    document.getElementById('topicFeedback').innerHTML = '';

    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      isRecording = true;
      btn.classList.add('recording');
      btn.textContent = '◼';
      status.textContent = '錄音中… 再點一次停止';
    };
    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += transcript + ' ';
        else interim += transcript;
      }
      document.getElementById('topicTranscript').innerHTML =
        `<div class="speech-bubble user">${escapeHTML(finalTranscript)}<i style="opacity:0.6">${escapeHTML(interim)}</i></div>`;
    };
    recognition.onerror = e => {
      status.textContent = '錯誤：' + e.error;
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      isRecording = false;
    };
    recognition.onend = async () => {
      isRecording = false;
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      status.textContent = '處理中…';
      if (!finalTranscript.trim()) { status.textContent = '沒有偵測到語音'; return; }
      if (!checkApiKey()) { status.textContent = '請先設定 API key 才能取得 AI 回饋'; return; }

      try {
        const fb = await callAI(`A learner answered this English speaking question:
Question: "${topic.q}"
Their spoken answer (transcribed by speech recognition, may have small errors):
"${finalTranscript.trim()}"

Give brief, encouraging feedback in Traditional Chinese. Cover:
1. 一句話總評（你說得如何）
2. 1-2 個小建議（文法 / 用字 / 流暢度）
3. 一個更地道的表達方式範例（用英文寫出，附中文翻譯）

Return JSON:
{
  "summary": "...",
  "tips": ["...", "..."],
  "improvedExample": { "en": "...", "zh": "..." }
}`);
        document.getElementById('topicFeedback').innerHTML = `
          <div class="feedback-block">
            <strong>AI 回饋</strong>
            <p style="margin-bottom:0.6rem">${escapeHTML(fb.summary || '')}</p>
            ${(fb.tips || []).map(t => `<p style="margin-bottom:0.4rem">• ${escapeHTML(t)}</p>`).join('')}
            ${fb.improvedExample ? `
              <div style="margin-top:0.8rem; padding-top:0.8rem; border-top:1px solid var(--line)">
                <strong style="color:var(--gold)">更地道的說法</strong>
                <p style="font-family:'Fraunces',serif; font-style:italic; margin-bottom:0.3rem">${escapeHTML(fb.improvedExample.en || '')}</p>
                <p style="color:var(--ink-muted); font-size:0.9rem">${escapeHTML(fb.improvedExample.zh || '')}</p>
              </div>` : ''}
          </div>
        `;
        status.textContent = '完成';
      } catch (err) {
        document.getElementById('topicFeedback').innerHTML = `<div class="feedback-block" style="border-left-color:var(--error)">回饋產生失敗：${escapeHTML(err.message)}</div>`;
        status.textContent = '';
      }
    };
    recognition.start();
  });
}

/* ----- Mode 3: 情境對話 (Dialog) ----- */
function renderDialogMode() {
  const container = document.getElementById('speakingContent');
  if (!SR) {
    container.innerHTML = `<div class="speaking-panel">${noSpeechWarningHTML()}</div>`;
    return;
  }
  container.innerHTML = `
    <div class="speaking-panel">
      <h3 style="font-family:'Fraunces',serif; font-size:1.3rem; margin-bottom:0.3rem">情境對話</h3>
      <p style="color:var(--ink-muted); font-size:0.9rem; margin-bottom:1.2rem">選一個情境，AI 扮演對方，跟你來回對話。</p>
      <div class="scenario-list" id="scenarioList">
        ${SCENARIOS.map(s => `<button class="scenario-btn" data-sid="${s.id}">${escapeHTML(s.title)}</button>`).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('[data-sid]').forEach(btn => {
    btn.addEventListener('click', () => startScenario(btn.dataset.sid));
  });
}

async function startScenario(sid) {
  if (!checkApiKey()) return;
  dialogScenario = SCENARIOS.find(s => s.id === sid);
  dialogHistory = [];
  const container = document.getElementById('speakingContent');
  container.innerHTML = `
    <div class="speaking-panel">
      <h3 style="font-family:'Fraunces',serif; font-size:1.3rem; margin-bottom:0.3rem">${escapeHTML(dialogScenario.title)}</h3>
      <p style="color:var(--ink-muted); font-size:0.9rem; margin-bottom:1.2rem">AI 會先開場。輪到你時按下麥克風回應。</p>
      <div id="dialogTranscript"></div>
      <button class="mic-btn" id="dialogMicBtn" disabled>🎙</button>
      <div class="mic-status" id="dialogMicStatus">AI 正在開場…</div>
      <div style="text-align:center; margin-top:1rem; display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap">
        <button class="action-btn secondary" id="dialogEndBtn">結束 + 取得整段回饋</button>
        <button class="action-btn secondary" id="dialogResetBtn">換情境</button>
      </div>
    </div>
  `;
  document.getElementById('dialogResetBtn').onclick = renderDialogMode;
  document.getElementById('dialogEndBtn').onclick = endDialog;

  await aiDialogTurn(true);
  setupDialogMic();
}

function appendDialogBubble(role, text) {
  const t = document.getElementById('dialogTranscript');
  const div = document.createElement('div');
  div.className = `speech-bubble ${role}`;
  div.textContent = text;
  t.appendChild(div);
  t.scrollTop = t.scrollHeight;
}

async function aiDialogTurn(isOpening = false) {
  const status = document.getElementById('dialogMicStatus');
  const mic = document.getElementById('dialogMicBtn');
  status.textContent = 'AI 正在回應…';
  mic.disabled = true;

  const historyText = dialogHistory.map(h => `${h.role === 'user' ? 'User' : 'You'}: ${h.content}`).join('\n');
  const prompt = isOpening
    ? `Open the scene with a natural greeting or opening line for this scenario. One short sentence only.`
    : `Continue the conversation naturally based on the history below. Reply with ONE short turn (1-2 sentences) only, in your role's voice.

Conversation so far:
${historyText}`;

  try {
    const reply = await callAI(prompt, {
      systemInstruction: dialogScenario.system,
      json: false,
      temperature: 0.9
    });
    const cleanReply = String(reply).trim().replace(/^["']|["']$/g, '');
    dialogHistory.push({ role: 'ai', content: cleanReply });
    appendDialogBubble('ai', cleanReply);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanReply);
    u.lang = 'en-US';
    u.rate = 0.95;
    if (State.selectedVoice) {
      const v = voices.find(x => x.name === State.selectedVoice);
      if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
    status.textContent = '輪到你了，按麥克風回應';
    mic.disabled = false;
  } catch (err) {
    status.textContent = 'AI 回應失敗：' + err.message;
    mic.disabled = false;
  }
}

function setupDialogMic() {
  let isRecording = false;
  let finalTranscript = '';
  document.getElementById('dialogMicBtn').addEventListener('click', () => {
    const btn = document.getElementById('dialogMicBtn');
    const status = document.getElementById('dialogMicStatus');
    if (isRecording) { recognition.stop(); return; }

    finalTranscript = '';
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      isRecording = true;
      btn.classList.add('recording');
      btn.textContent = '◼';
      status.textContent = '聽你說…';
    };
    recognition.onresult = e => { finalTranscript = e.results[0][0].transcript; };
    recognition.onerror = e => {
      status.textContent = '錯誤：' + e.error;
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      isRecording = false;
    };
    recognition.onend = async () => {
      isRecording = false;
      btn.classList.remove('recording');
      btn.textContent = '🎙';
      if (!finalTranscript.trim()) { status.textContent = '沒聽到，再試一次'; return; }
      dialogHistory.push({ role: 'user', content: finalTranscript.trim() });
      appendDialogBubble('user', finalTranscript.trim());
      await aiDialogTurn(false);
    };
    recognition.start();
  });
}

async function endDialog() {
  if (dialogHistory.length === 0) return;
  if (!checkApiKey()) return;
  const status = document.getElementById('dialogMicStatus');
  status.textContent = '產生整段回饋中…';
  const transcript = dialogHistory.map(h => `${h.role === 'user' ? 'You (learner)' : 'AI'}: ${h.content}`).join('\n');
  try {
    const fb = await callAI(`A learner had this English conversation in a "${dialogScenario.title}" scenario:

${transcript}

Give the learner brief, encouraging feedback in Traditional Chinese. Cover:
1. 一句話總評（整體表現）
2. 2-3 個具體可改進的點（用字、文法、自然度等）
3. 一句他們說得不錯的話，並說為什麼

Return JSON:
{
  "summary": "...",
  "improvements": ["...", "...", "..."],
  "highlight": { "quote": "...", "why": "..." }
}`);
    const t = document.getElementById('dialogTranscript');
    const fb_div = document.createElement('div');
    fb_div.className = 'feedback-block';
    fb_div.innerHTML = `
      <strong>整段回饋</strong>
      <p style="margin-bottom:0.6rem">${escapeHTML(fb.summary || '')}</p>
      ${(fb.improvements || []).map(i => `<p style="margin-bottom:0.4rem">• ${escapeHTML(i)}</p>`).join('')}
      ${fb.highlight ? `
        <div style="margin-top:0.8rem; padding-top:0.8rem; border-top:1px solid var(--line)">
          <strong style="color:var(--gold)">亮點</strong>
          <p style="font-style:italic; margin-bottom:0.3rem">"${escapeHTML(fb.highlight.quote || '')}"</p>
          <p style="color:var(--ink-muted); font-size:0.9rem">${escapeHTML(fb.highlight.why || '')}</p>
        </div>` : ''}
    `;
    t.appendChild(fb_div);
    t.scrollTop = t.scrollHeight;
    status.textContent = '完成';
    document.getElementById('dialogMicBtn').disabled = true;
  } catch (err) {
    status.textContent = '回饋失敗：' + err.message;
  }
}
