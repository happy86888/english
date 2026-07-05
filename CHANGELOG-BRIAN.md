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
