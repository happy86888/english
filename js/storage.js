/* ============================================================
   storage.js · 本機儲存與全域狀態
   ============================================================ */

window.Store = {
  get: (k, d) => {
    try { const v = JSON.parse(localStorage.getItem('dawn_'+k)); return v ?? d; }
    catch { return d; }
  },
  set: (k, v) => localStorage.setItem('dawn_'+k, JSON.stringify(v)),
  clearAll: () => Object.keys(localStorage)
    .filter(k => k.startsWith('dawn_'))
    .forEach(k => localStorage.removeItem(k))
};

window.State = {
  vocab: Store.get('vocab', {}),
  customArticles: Store.get('custom_articles', []),
  aiArticles: Store.get('ai_articles', []),
  customVideos: Store.get('custom_videos', []),
  completed: Store.get('completed', {}),
  streak: Store.get('streak', { count: 0, lastDate: null }),
  selectedVoice: Store.get('voice', null),
  apiKey: Store.get('api_key', ''),
  model: Store.get('model', 'gemini-2.0-flash'),
  speechRate: 0.9,
  currentArticle: null,
};

window.save = function() {
  Store.set('vocab', State.vocab);
  Store.set('custom_articles', State.customArticles);
  Store.set('ai_articles', State.aiArticles);
  Store.set('custom_videos', State.customVideos || []);
  Store.set('completed', State.completed);
  Store.set('streak', State.streak);
};

window.getAllArticles = function() {
  return [...BUILTIN_ARTICLES, ...State.aiArticles, ...State.customArticles];
};

window.updateStreak = function() {
  const today = new Date().toDateString();
  if (State.streak.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (State.streak.lastDate === yesterday) State.streak.count += 1;
  else State.streak.count = 1;
  State.streak.lastDate = today;
  save();
};

window.escapeHTML = function(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
};

window.toast = (function() {
  let timeout;
  return function(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(timeout);
    timeout = setTimeout(() => t.classList.remove('visible'), 2400);
  };
})();
