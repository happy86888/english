/* ============================================================
   data.js · 內建資料（短文、影片、口說素材）
   全部透過 window 物件對外曝露，供其他模組使用。
   ============================================================ */

window.BUILTIN_ARTICLES = [
  {
    id: 'a2-coffee',
    level: 'A2',
    title: 'A Quiet Morning',
    titleZh: '安靜的早晨',
    en: [
      'Maya wakes up at six. The room is still dark. She walks to the window and opens the curtains. The sky is pink and orange.',
      'She makes a cup of coffee. The smell fills the small kitchen. She sits at the table and reads a book for thirty minutes.',
      'This is her favorite part of the day. The world is quiet. Her mind is calm. She feels ready for anything.'
    ],
    zh: [
      '瑪雅六點醒來。房間還很暗。她走到窗邊，拉開窗簾。天空是粉色和橘色的。',
      '她泡了一杯咖啡。香味充滿了這個小廚房。她坐在桌邊，讀了三十分鐘的書。',
      '這是她一天中最喜歡的時刻。世界很安靜，心也很平靜。她覺得自己準備好面對任何事了。'
    ],
    quiz: [
      { q: 'What time does Maya wake up?', options: ['Five', 'Six', 'Seven', 'Eight'], a: 1 },
      { q: 'What does she do after making coffee?', options: ['Watch TV', 'Read a book', 'Go for a walk', 'Call a friend'], a: 1 },
      { q: 'How does she feel in the morning?', options: ['Tired', 'Worried', 'Calm', 'Bored'], a: 2 }
    ]
  },
  {
    id: 'b1-habit',
    level: 'B1',
    title: 'The Power of Small Habits',
    titleZh: '微小習慣的力量',
    en: [
      'Most people believe that big results require big actions. But research suggests the opposite. Small habits, repeated daily, often create the most lasting change.',
      'Reading just ten pages a day adds up to twelve books a year. Saving one dollar daily becomes hundreds in a year. The trick is not motivation but consistency.',
      'When we set goals that are too ambitious, we usually give up after a week. Tiny goals feel boring at first, but they grow on us. Slowly, they become part of who we are.'
    ],
    zh: [
      '大多數人相信大成果需要大行動，但研究顯示恰好相反。每天重複的小習慣，往往帶來最持久的改變。',
      '一天讀十頁書，一年累積就是十二本。一天存一塊錢，一年就是好幾百。重點不是動力，而是持之以恆。',
      '當我們設下太遠大的目標，通常一週後就放棄了。小小的目標一開始很無聊，但會慢慢長出來，變成我們的一部分。'
    ],
    quiz: [
      { q: 'What does research suggest about habits?', options: ['Big actions matter most', 'Small habits create lasting change', 'Habits are unimportant', 'Motivation is the key'], a: 1 },
      { q: 'Reading 10 pages a day equals how many books a year?', options: ['Six', 'Ten', 'Twelve', 'Twenty'], a: 2 },
      { q: 'Why do ambitious goals often fail?', options: ['They are too cheap', 'People give up after a week', 'They take too long to plan', 'They are too easy'], a: 1 }
    ]
  },
  {
    id: 'b1-stranger',
    level: 'B1',
    title: 'A Stranger on the Train',
    titleZh: '火車上的陌生人',
    en: [
      'On a long train ride from Taipei to Hualien, I sat next to an elderly man with a worn leather notebook. He smiled politely and went back to writing.',
      'After an hour, curiosity got the better of me. I asked what he was writing. He said he had kept a journal every day for forty-seven years.',
      'He told me his secret: never write what you did, only what you noticed. A bird, a stranger\'s laugh, the color of the sky. That is what makes a life feel rich.',
      'When the train arrived, he gave me a small notebook from his bag. "Start tonight," he said. I have been writing ever since.'
    ],
    zh: [
      '在從台北到花蓮的長途火車上，我坐在一位老先生旁邊，他有一本舊舊的皮製筆記本。他禮貌地笑了笑，又繼續寫。',
      '過了一個小時，我忍不住好奇，問他在寫什麼。他說他已經每天寫日記，整整四十七年了。',
      '他告訴我他的秘訣：不要寫你做了什麼，只寫你注意到了什麼。一隻鳥、一個陌生人的笑聲、天空的顏色。這樣才會讓人生覺得豐盛。',
      '火車到站時，他從袋子裡拿了一本小筆記本送我。「今晚就開始吧。」他說。從那之後，我就一直在寫。'
    ],
    quiz: [
      { q: 'Where was the train going?', options: ['Taipei to Taichung', 'Taipei to Hualien', 'Hualien to Taipei', 'Taichung to Hualien'], a: 1 },
      { q: 'How long had the man kept a journal?', options: ['Seventeen years', 'Twenty-seven years', 'Forty-seven years', 'Fifty-seven years'], a: 2 },
      { q: 'What was his journaling secret?', options: ['Write everything you did', 'Write only what you noticed', 'Write only at night', 'Write in poetry form'], a: 1 }
    ]
  },
  {
    id: 'b2-attention',
    level: 'B2',
    title: 'The Currency of Attention',
    titleZh: '注意力這種貨幣',
    en: [
      'We often speak of money as the most precious resource, yet attention may be far more valuable—and far more easily squandered. Every notification, every reflexive scroll, draws from a finite reservoir we rarely think to protect.',
      'Unlike money, attention cannot be saved or borrowed. Once spent on a trivial argument or a forgettable feed, those minutes are gone, untraceable. Multiply this by months and we begin to understand why so many feel busy yet strangely unfulfilled.',
      'The discipline of guarding attention is not about productivity. It is about deciding, with quiet intention, what deserves a piece of your one short life.'
    ],
    zh: [
      '我們常說金錢是最珍貴的資源，但注意力可能更有價值，也更容易被揮霍。每一則通知、每一次本能的滑動，都從一個我們很少留心保護的有限資源庫裡取走一份。',
      '注意力不像金錢，無法儲蓄也無法借貸。一旦花在無謂的爭論或轉眼就忘的動態上，那些分鐘就消失了，無從追回。乘上幾個月，我們就會明白為什麼那麼多人忙得不可開交，卻感到莫名空虛。',
      '守護注意力這件事，不是為了效率。它是在安靜的意識中決定，什麼東西值得從你短短一生中分得一塊。'
    ],
    quiz: [
      { q: 'According to the article, attention is:', options: ['Less valuable than money', 'Easier to save than money', 'Possibly more valuable than money', 'Worth nothing alone'], a: 2 },
      { q: 'Unlike money, attention cannot be:', options: ['Spent', 'Saved or borrowed', 'Wasted', 'Measured'], a: 1 },
      { q: 'The discipline of guarding attention is mainly about:', options: ['Being more productive', 'Saving more money', 'Choosing what deserves your life', 'Avoiding all technology'], a: 2 }
    ]
  }
];

/* 影片清單。所有影片都會嘗試嵌入，失敗時顯示「在 YouTube 開啟」 */
window.BUILTIN_VIDEOS = [
  // 英文教學 - BBC Learning English 6 Minute English（嵌入友善）
  {
    id: 'yt-bbc-6min-stress',
    cat: 'youtube',
    youtubeId: 'gWqz_S-fJ8M',
    title: '6 Minute English: How to manage stress',
    desc: 'BBC Learning English 經典 6 Minute English 系列，用日常情境學新單字。'
  },
  {
    id: 'yt-bbc-6min-exercise',
    cat: 'youtube',
    youtubeId: 'XLXPzDGZBlA',
    title: '6 Minute English: The benefits of exercise',
    desc: 'BBC 6 分鐘英語：運動對身心的好處，附中等難度詞彙。'
  },
  {
    id: 'yt-bbc-grammar-tense',
    cat: 'youtube',
    youtubeId: 'QYx6PnPL3Yg',
    title: 'BBC: English in a Minute - Past Tenses',
    desc: 'BBC 一分鐘英語：過去式的用法精華。'
  },
  {
    id: 'yt-engvid-r',
    cat: 'youtube',
    youtubeId: 'sB1cWdC8aTY',
    title: "Rachel's English: How to Pronounce R",
    desc: '美式發音老師 Rachel 教 R 音的舌位與練習法。'
  },

  // TED 演講 - 經典且通常開放嵌入
  {
    id: 'ted-duckworth-grit',
    cat: 'ted',
    youtubeId: 'H14bBuluwB8',
    title: 'Angela Duckworth: Grit',
    desc: '心理學家談「恆毅力」——比天賦更能預測成功的特質。'
  },
  {
    id: 'ted-cuddy-power',
    cat: 'ted',
    youtubeId: 'Ks-_Mh1QhMc',
    title: 'Amy Cuddy: Your body language may shape who you are',
    desc: '兩分鐘的肢體姿勢，可能改變你的內在狀態。'
  },
  {
    id: 'ted-sinek-why',
    cat: 'ted',
    youtubeId: 'qp0HIF3SfI4',
    title: 'Simon Sinek: Start With Why',
    desc: '偉大領袖如何激勵人？從「為什麼」開始的力量。'
  },
  {
    id: 'ted-robinson-creativity',
    cat: 'ted',
    youtubeId: 'iG9CE55wbtY',
    title: 'Sir Ken Robinson: Do schools kill creativity?',
    desc: 'TED 史上播放最高的演講之一，談教育與創造力。'
  },

  // 純英文短片（不雙語）— 適合單純練聽力與看英文字幕
  {
    id: 'short-stoic',
    cat: 'short',
    youtubeId: 'R9OCA6UFE-0',
    title: 'Stoic Wisdom for Daily Life',
    desc: '幾分鐘的英語短片，適合練純英聽。'
  },
  {
    id: 'short-deep-work',
    cat: 'short',
    youtubeId: 'XVf-CMkPgwI',
    title: 'How to Focus and Do Deep Work',
    desc: '提升專注力的英文小短片。'
  }
];

/* 跟讀練習素材 */
window.SHADOW_SENTENCES = [
  // A2 level
  { en: 'I usually have coffee in the morning.', zh: '我通常早上喝咖啡。' },
  { en: 'Could you please repeat that?', zh: '你可以再說一次嗎？' },
  { en: 'How was your weekend?', zh: '你週末過得如何？' },
  { en: 'I think it is going to rain today.', zh: '我覺得今天會下雨。' },
  // B1 level
  { en: 'I have been working on this project for two months.', zh: '我已經做這個專案兩個月了。' },
  { en: 'Honestly, I had not expected things to turn out this way.', zh: '老實說，我沒料到事情會變成這樣。' },
  { en: 'It depends on what you mean by success.', zh: '這取決於你怎麼定義成功。' },
  { en: 'Let me think about it for a moment before I answer.', zh: '讓我想一下再回答你。' },
];

/* 個人話題題庫 */
window.TOPICS = [
  { q: 'Tell me about a place that feels like home to you. Why?', zh: '聊聊一個你覺得像家的地方。為什麼？' },
  { q: 'What is something you do every day that makes you happy?', zh: '你每天做的什麼事讓你開心？' },
  { q: 'Describe a small win you had recently.', zh: '描述一個你最近的小成就。' },
  { q: 'If you had a free Saturday, what would you do?', zh: '如果週六全空，你會做什麼？' },
  { q: 'What is a skill you would like to learn this year?', zh: '今年你想學什麼技能？' },
  { q: 'Tell me about a book or movie that stayed with you.', zh: '說一本書或電影，讓你印象深刻的。' },
];

/* 情境對話腳本 */
window.SCENARIOS = [
  { id: 'restaurant', title: '在餐廳點餐', system: 'You are a friendly waiter at a casual restaurant. Greet the user, ask for their order, suggest dishes if they ask. Stay in character. Keep replies short (1-2 sentences). After 6-8 exchanges, naturally wrap up.' },
  { id: 'airport', title: '機場 check-in', system: 'You are a polite airline check-in agent. Ask for the user\'s ticket and ID, ask about baggage and seat preference, check them in. Stay in character. Keep replies short. After 6-8 exchanges, wrap up by handing them their boarding pass.' },
  { id: 'interview', title: '工作面試', system: 'You are a hiring manager interviewing the user for a job they applied for (a marketing coordinator role at a small tech company). Ask realistic interview questions one at a time, react warmly to answers. Stay in character. Keep replies short. After 6-8 questions, wrap up by saying you\'ll be in touch.' },
  { id: 'doctor', title: '看醫生', system: 'You are a kind general practitioner. The user is your patient. Ask what is wrong, ask follow-up questions, give simple advice. Stay in character. Keep replies short. After 6-8 exchanges, wrap up with a treatment plan.' },
  { id: 'directions', title: '在街上問路', system: 'You are a friendly local in a city the user is visiting. They will ask you for directions. Help them, suggest a nearby cafe or sight, chat briefly. Keep replies short and natural. After 5-6 exchanges, wrap up.' },
  { id: 'shopping', title: '在商店試衣服', system: 'You are a helpful shop assistant in a clothing store. Help the user find what they want, suggest sizes, give honest feedback. Keep replies short. After 6-8 exchanges, wrap up with checkout.' }
];

window.MODE_LABELS = {
  recognize: 'Recognize · 認字',
  dictation: 'Dictation · 聽寫',
  spelling:  'Spelling · 拼字',
  cloze:     'Cloze · 填空'
};
