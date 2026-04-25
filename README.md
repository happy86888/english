# 晨讀 · Dawn Reader

英文自學網站。

## 部署到 GitHub Pages

把整個資料夾的內容（**不是資料夾本身**）push 到 repo 根目錄。最終 repo 結構應該長這樣：

```
你的repo/
├── index.html
├── README.md
├── css/style.css
└── js/*.js
```

Repo Settings → Pages → Source 選 main branch、root → Save。

## 本機開發

不能直接雙擊 index.html 開啟。要用 HTTP server：

```bash
cd dawn-reader
python3 -m http.server 8000
# 開瀏覽器到 http://localhost:8000
```

## 兩個 API key

第一次打開到「設定」頁面：

### 1. Gemini API key（必填，AI 功能用）
到 [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 申請 → 貼進設定頁。

### 2. YouTube Data API key（可選，每日新鮮影片用）
不填也能用其他功能，只是「🔥 每日新鮮」分類會顯示提示。

申請步驟：
1. 到 [console.cloud.google.com](https://console.cloud.google.com/) 建立專案
2. 啟用「YouTube Data API v3」
3. 建立 API 金鑰
4. 貼進設定頁

## 檔案結構

```
js/
├── data.js        內建短文、影片、口說素材
├── storage.js     localStorage、State 工具
├── api.js         Gemini API 呼叫、Wikipedia 抓取
├── reader.js      閱讀頁、單字查詢、TTS
├── vocab.js       單字本、SRS 複習
├── videos.js      影片專區（含每日新鮮 YouTube 搜尋）
├── speaking.js    口說練習三模式
└── main.js        路由、初始化、設定頁
```

## 注意事項

- 口說「個人話題」與「情境對話」需要瀏覽器支援 SpeechRecognition（Chrome / Edge / Safari ✅；Firefox ❌）
- 影片若顯示「內容已遭到封鎖」，是 YouTube 影片擁有者禁止嵌入；點影片下方的「在 YouTube 開啟」備援按鈕即可跳出去看
- 「每日新鮮」每天同一程度第一次搜尋會用 100 quota units，之後會走快取（同一天同程度不再消耗 quota）
- 所有資料都在使用者瀏覽器的 localStorage，記得到設定頁定期匯出備份
