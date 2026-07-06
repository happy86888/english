# Brian handoff notes

## 2026-07-05

### API provider upgrade
- Added OpenRouter as a third AI provider alongside Gemini and Groq.
- Added Settings UI for OpenRouter API key and model selection.
- Default OpenRouter model: `~anthropic/claude-sonnet-latest`.
- Other preset model options: `~openai/gpt-latest`, `anthropic/claude-sonnet-5`, `google/gemini-2.5-pro`.
- OpenRouter requests use the OpenAI-compatible `/api/v1/chat/completions` endpoint.

### Output diversity upgrade
- Added randomized creative briefs for AI article generation.
- The prompt now varies narrative format, paragraph structure, angle, and banned generic phrases.
- This targets the previous issue where generated short articles felt structurally similar.

### Files changed
- `index.html`
- `js/storage.js`
- `js/api.js`
- `js/main.js`

## 2026-07-05 · 修正 OpenRouter Header 錯誤

- 修正 OpenRouter 呼叫時，`X-Title` 使用中文網頁標題造成瀏覽器 `fetch` 失敗的問題。
- 將 OpenRouter `X-Title` 固定為 ASCII 字串 `Dawn Reader`。
- API key 送出前會先 `trim()`，避免複製貼上時多出空白造成驗證失敗。

## 2026-07-05 通行碼移除
- 移除 `index.html` 對 `js/auth.js` 的載入。
- 網站開啟後不再要求輸入通行碼。
- `js/auth.js` 檔案保留但未啟用，未來需要時可重新接回。

## 2026-07-05 · Header encoding 強化修正
- 移除 OpenRouter optional headers，避免中文網域、中文網站標題或部署環境字串造成 fetch header 編碼錯誤。
- Groq / OpenRouter 的 Bearer token 送出前會自動清除非 ASCII 字元，避免 API key 複製時帶到中文註記或不可見字元。
- 保留無通行碼設定。

## 2026-07-05 v3 deployment fix
- Physically removed `js/auth.js` from the package, so the old passcode overlay cannot load even if an old index references it.
- Added cache-busting query strings to CSS and all JS files.
- Added build marker: `20260705-v3-no-password-cachebust`.
- Added stricter OpenRouter/Groq API key validation before `fetch`.

## 2026-07-06 · v4 sentence audio + article import

- Disabled the prior trial/paywall access logic. `Access.tryUse()` now always returns true; no passcode, no daily limit, no paywall modal.
- Added sentence-level reading controls in the article reader:
  - previous sentence / repeat sentence / next sentence
  - current sentence highlight
  - sentence counter
  - works with browser TTS and Google Cloud TTS fallback flow
- Added web article import:
  - paste a URL, then fetch readable text through Reader API
  - paste raw article body as fallback
  - AI turns the source into an English reading lesson with Traditional Chinese translation and comprehension quiz
- Added cache-busted build marker `20260706-v4-reader-import`.
