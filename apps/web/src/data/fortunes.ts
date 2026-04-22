// 本日觀星 — daily fortune cards.
//
// Weights are relative. Per-tier distribution is enforced in code: we first pick
// a tier (10% / 40% / 50%), then uniformly pick among that tier's fortunes.
// Adding a new fortune to a tier automatically rebalances the within-tier odds.
//
// Voice: half the cards are "playful" (cheeky, K-pop-flavored), half are
// "mystical" (earnest fortune-teller). Keep both voices alive when adding more.
//
// Members: ethan (leader / lead vocals), alan (rap / producer), albert
// (dance / visuals). Use "random" when no specific member vibe fits.

import type { Locale } from "../lib/i18n";

export type Tier = "super" | "very" | "lucky";
export type Voice = "playful" | "mystical";
export type MemberId = "ethan" | "alan" | "albert" | "random";

export type Fortune = {
  id: string;
  tier: Tier;
  voice: Voice;
  memberId: MemberId;
  lucky: {
    color: string; // CSS color
    colorName: Record<Locale, string>;
    number: number; // 1-9
    track: string; // song title suggestion
  };
  copy: Record<Locale, {
    headline: string; // one-line fortune, ~20 chars
    body: string;     // 2-3 short sentences
  }>;
};

export const TIER_WEIGHTS: Record<Tier, number> = {
  super: 0.10,
  very:  0.40,
  lucky: 0.50,
};

export const FORTUNES: Fortune[] = [
  // ─────────────────────────── SUPER LUCKY (2) ───────────────────────────
  {
    id: "super-01",
    tier: "super",
    voice: "playful",
    memberId: "ethan",
    lucky: {
      color: "#FFD84A",
      colorName: { "zh-TW": "金", en: "gold", ja: "ゴールド", de: "Gold" },
      number: 1,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "宇宙今天只看你一個",
        body: "星軌全部對齊在你身上。打開手機,驚喜就在下一個通知裡。放膽往前,連紅綠燈都會讓你。",
      },
      en: {
        headline: "The universe has eyes only for you",
        body: "Every star lined up in your favour. Check your phone — the surprise is one notification away. Walk bold; even the traffic lights will wait for you.",
      },
      ja: {
        headline: "宇宙が今日、君だけを見ている",
        body: "星の軌道が君の真上で重なった。スマホを開いて、驚きは次の通知の中。大胆に進めば、信号さえ君を待ってくれる。",
      },
      de: {
        headline: "Das Universum schaut heute nur dich an",
        body: "Alle Sternenbahnen richten sich auf dich. Schau aufs Handy — die Überraschung wartet in der nächsten Nachricht. Geh mutig los; sogar die Ampeln warten.",
      },
    },
  },
  {
    id: "super-02",
    tier: "super",
    voice: "mystical",
    memberId: "alan",
    lucky: {
      color: "#2E5FFF",
      colorName: { "zh-TW": "電藍", en: "electric blue", ja: "エレクトリックブルー", de: "Elektroblau" },
      number: 7,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "三顆流星同時為你劃過",
        body: "今日星盤極其罕見,願望層級提升三階。不要藏著你想說的話,不要壓抑你想跳的拍子。",
      },
      en: {
        headline: "Three shooting stars cross for you",
        body: "Today's chart is vanishingly rare — your wishes level up three tiers. Don't hide the words you want to say, don't mute the beat you want to dance to.",
      },
      ja: {
        headline: "三つの流星が君のために横切る",
        body: "今日の星の配置は極めて稀で、願いが三段階引き上がる。言いたい言葉を隠さないで、踊りたいビートを止めないで。",
      },
      de: {
        headline: "Drei Sternschnuppen kreuzen sich für dich",
        body: "Die heutige Konstellation ist selten — deine Wünsche steigen um drei Stufen. Halte die Worte nicht zurück, dämpfe den Beat nicht.",
      },
    },
  },

  // ─────────────────────────── VERY LUCKY (6) ───────────────────────────
  {
    id: "very-01",
    tier: "very",
    voice: "playful",
    memberId: "albert",
    lucky: {
      color: "#FF7AB6",
      colorName: { "zh-TW": "粉", en: "pink", ja: "ピンク", de: "Pink" },
      number: 3,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "今天發訊息,回覆速度翻三倍",
        body: "你一直在等的那個人今天特別想你。按下傳送,別想太多。",
      },
      en: {
        headline: "Today every message gets a 3× faster reply",
        body: "The one you've been waiting on is thinking about you today. Hit send. Don't overthink it.",
      },
      ja: {
        headline: "今日のメッセージは返信が3倍速い",
        body: "ずっと待っていた相手が、今日は君のことを思っている。送信を押して、考えすぎない。",
      },
      de: {
        headline: "Heute kommen Antworten 3× schneller",
        body: "Die Person, auf die du wartest, denkt heute an dich. Drück auf senden. Denk nicht zu viel nach.",
      },
    },
  },
  {
    id: "very-02",
    tier: "very",
    voice: "mystical",
    memberId: "ethan",
    lucky: {
      color: "#B8CCFF",
      colorName: { "zh-TW": "冰藍", en: "ice blue", ja: "アイスブルー", de: "Eisblau" },
      number: 9,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "你說出口的話會比你想的更遠",
        body: "北極星在你這一側。今天適合提案、適合告白、適合按下送出鍵。",
      },
      en: {
        headline: "What you say today travels further than you think",
        body: "Polaris sits on your side. A good day to pitch, to confess, to hit submit.",
      },
      ja: {
        headline: "今日の言葉は思ったより遠くまで届く",
        body: "北極星は君の側にある。提案にも、告白にも、送信ボタンにも向いた日。",
      },
      de: {
        headline: "Was du heute sagst, reist weiter als gedacht",
        body: "Der Polarstern steht auf deiner Seite. Ein guter Tag für Pitches, Geständnisse, den Senden-Knopf.",
      },
    },
  },
  {
    id: "very-03",
    tier: "very",
    voice: "playful",
    memberId: "alan",
    lucky: {
      color: "#FFD84A",
      colorName: { "zh-TW": "金", en: "gold", ja: "ゴールド", de: "Gold" },
      number: 2,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "咖啡會比平常更好喝",
        body: "生活把小驚喜塞進你今天的口袋,只是你要記得翻。低頭看一下手邊。",
      },
      en: {
        headline: "Your coffee tastes better than usual today",
        body: "Life tucked small surprises into your pockets. Remember to check. Look down at what's in your hands.",
      },
      ja: {
        headline: "今日のコーヒーはいつもより美味しい",
        body: "人生は小さなサプライズを君のポケットに入れた。確認するのを忘れないで。手元を見て。",
      },
      de: {
        headline: "Der Kaffee schmeckt heute besser als sonst",
        body: "Das Leben hat kleine Überraschungen in deine Taschen gesteckt. Nachsehen nicht vergessen. Schau, was in deinen Händen liegt.",
      },
    },
  },
  {
    id: "very-04",
    tier: "very",
    voice: "mystical",
    memberId: "albert",
    lucky: {
      color: "#8DA7FF",
      colorName: { "zh-TW": "星河紫", en: "galaxy violet", ja: "ギャラクシーバイオレット", de: "Galaxieviolett" },
      number: 5,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "被你注視的東西會亮起來",
        body: "今天凡是你專心做的事,都會多給你一點回報。把注意力放在值得的地方。",
      },
      en: {
        headline: "Whatever you look at today starts to glow",
        body: "Anything you give focus to pays back extra. Put your attention where it deserves to be.",
      },
      ja: {
        headline: "君が見つめるものが輝き始める",
        body: "今日、集中して取り組むものは少し多めに返ってくる。意識を、価値ある場所に置こう。",
      },
      de: {
        headline: "Was du heute ansiehst, beginnt zu leuchten",
        body: "Alles, worauf du dich konzentrierst, zahlt sich extra aus. Richte deine Aufmerksamkeit auf das, was es wert ist.",
      },
    },
  },
  {
    id: "very-05",
    tier: "very",
    voice: "playful",
    memberId: "random",
    lucky: {
      color: "#FFB84A",
      colorName: { "zh-TW": "暖金", en: "warm gold", ja: "ウォームゴールド", de: "Warmgold" },
      number: 8,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "今天你不小心走的那條路會是對的",
        body: "亂猜的那題會對,亂選的餐廳會好吃,亂走的那條街會遇到驚喜。",
      },
      en: {
        headline: "Today the wrong turn becomes the right one",
        body: "The answer you guessed is correct. The restaurant you picked at random is great. The street you wandered down has a surprise.",
      },
      ja: {
        headline: "今日、偶然曲がった道が正解",
        body: "当てずっぽうの答えが合っていて、適当に選んだ店が美味しくて、ふらっと歩いた通りにサプライズがある。",
      },
      de: {
        headline: "Heute wird aus der falschen Abbiegung die richtige",
        body: "Die geratene Antwort stimmt. Das zufällig gewählte Restaurant ist super. Die Straße, in die du abgebogen bist, hält eine Überraschung bereit.",
      },
    },
  },
  {
    id: "very-06",
    tier: "very",
    voice: "mystical",
    memberId: "random",
    lucky: {
      color: "#2E5FFF",
      colorName: { "zh-TW": "電藍", en: "electric blue", ja: "エレクトリックブルー", de: "Elektroblau" },
      number: 6,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "你想了很久的事,今天給自己一個答案",
        body: "星象鼓勵決定,不鼓勵猶豫。不一定要大動作,但請不要再問第三遍。",
      },
      en: {
        headline: "Something you've turned over for weeks — give yourself the answer today",
        body: "The stars favour decisions, not hesitation. The move doesn't have to be big. Just don't ask yourself a third time.",
      },
      ja: {
        headline: "ずっと考えていたことに、今日こそ答えを",
        body: "星は決断を後押しし、迷いを後押ししない。大きな動きでなくていい。でも、三度目は問わないで。",
      },
      de: {
        headline: "Etwas, das du lange wälzt — heute gib dir die Antwort",
        body: "Die Sterne mögen Entscheidungen, kein Zögern. Der Schritt muss nicht groß sein. Frag dich nur nicht zum dritten Mal.",
      },
    },
  },

  // ───────────────────────────── LUCKY (7) ─────────────────────────────
  {
    id: "lucky-01",
    tier: "lucky",
    voice: "playful",
    memberId: "ethan",
    lucky: {
      color: "#B8CCFF",
      colorName: { "zh-TW": "冰藍", en: "ice blue", ja: "アイスブルー", de: "Eisblau" },
      number: 4,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "平凡裡面藏著一個小亮點",
        body: "不會天降好事,但你會發現一件早就該高興的事。笑一個,星星看得到。",
      },
      en: {
        headline: "A tiny bright spot hides in the ordinary",
        body: "No fireworks, but you'll notice something that deserved a smile all along. Smile — the stars can see.",
      },
      ja: {
        headline: "普通の中に、小さな光が一つ",
        body: "派手な出来事はない。でも、ずっと喜ぶべきだった何かに気づく。笑って。星は見ている。",
      },
      de: {
        headline: "Im Alltag versteckt sich ein kleiner Lichtpunkt",
        body: "Kein Feuerwerk, aber du bemerkst etwas, das längst ein Lächeln verdient hat. Lächle — die Sterne sehen es.",
      },
    },
  },
  {
    id: "lucky-02",
    tier: "lucky",
    voice: "mystical",
    memberId: "alan",
    lucky: {
      color: "#8DA7FF",
      colorName: { "zh-TW": "星河紫", en: "galaxy violet", ja: "ギャラクシーバイオレット", de: "Galaxieviolett" },
      number: 2,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "你的節奏今天比別人慢半拍,剛好",
        body: "不要追別人的速度。你的那一拍落下去,聲音會比較清楚。",
      },
      en: {
        headline: "Your rhythm runs half a beat slow today — that's right",
        body: "Don't chase someone else's tempo. Your beat, dropped on time, sounds cleaner.",
      },
      ja: {
        headline: "今日の君のリズムは半拍遅め、それが正解",
        body: "他人の速さを追わない。君のビートが落ちると、音は澄んで聞こえる。",
      },
      de: {
        headline: "Dein Rhythmus ist heute einen halben Takt langsamer — genau richtig",
        body: "Jage nicht dem Tempo anderer hinterher. Dein Takt, im richtigen Moment gesetzt, klingt klarer.",
      },
    },
  },
  {
    id: "lucky-03",
    tier: "lucky",
    voice: "playful",
    memberId: "albert",
    lucky: {
      color: "#FF7AB6",
      colorName: { "zh-TW": "粉", en: "pink", ja: "ピンク", de: "Pink" },
      number: 6,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "今天穿一件亮色的,好事追得到你",
        body: "不亮不會怎樣,但亮了真的比較好。連表情包都要穿金色的。",
      },
      en: {
        headline: "Wear something bright today — good things need a target",
        body: "Dull works fine. Bright works better. Even your emoji should wear gold.",
      },
      ja: {
        headline: "今日は明るい色を一点。幸運が君を見つけやすくなる",
        body: "地味でも大丈夫。でも明るい方が、いい。絵文字まで金色にして。",
      },
      de: {
        headline: "Trag heute etwas Helles — das Glück braucht ein Ziel",
        body: "Gedeckt geht auch. Hell geht besser. Sogar dein Emoji sollte Gold tragen.",
      },
    },
  },
  {
    id: "lucky-04",
    tier: "lucky",
    voice: "mystical",
    memberId: "ethan",
    lucky: {
      color: "#FFD84A",
      colorName: { "zh-TW": "金", en: "gold", ja: "ゴールド", de: "Gold" },
      number: 3,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "天上有人記得你的名字",
        body: "今日不大起大落,但你會被溫柔地照著。相信你值得的那一部分。",
      },
      en: {
        headline: "Up in the sky, someone remembers your name",
        body: "No wild swings today. Just a soft light on you. Trust the part of you that knows you deserve it.",
      },
      ja: {
        headline: "空の上で、誰かが君の名前を覚えている",
        body: "今日は大きな波はない。ただ、やわらかな光が君を照らす。値する自分を、信じて。",
      },
      de: {
        headline: "Oben am Himmel erinnert sich jemand an deinen Namen",
        body: "Keine großen Ausschläge heute. Nur ein weiches Licht auf dir. Vertraue dem Teil in dir, der weiß, dass du es verdient hast.",
      },
    },
  },
  {
    id: "lucky-05",
    tier: "lucky",
    voice: "playful",
    memberId: "alan",
    lucky: {
      color: "#2E5FFF",
      colorName: { "zh-TW": "電藍", en: "electric blue", ja: "エレクトリックブルー", de: "Elektroblau" },
      number: 5,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "今天適合再試一次",
        body: "昨天沒成的事,今天可以再丟一次骰子。老天有耐心看你進步。",
      },
      en: {
        headline: "Today is a good day to try again",
        body: "The thing that missed yesterday — roll the dice once more. The sky has patience for your progress.",
      },
      ja: {
        headline: "今日はもう一度挑戦する日",
        body: "昨日うまくいかなかったこと、今日もう一度サイコロを振っていい。空は君の成長を待っている。",
      },
      de: {
        headline: "Heute ist ein guter Tag für einen zweiten Versuch",
        body: "Was gestern nicht geklappt hat — wirf den Würfel noch einmal. Der Himmel hat Geduld mit deinem Fortschritt.",
      },
    },
  },
  {
    id: "lucky-06",
    tier: "lucky",
    voice: "mystical",
    memberId: "albert",
    lucky: {
      color: "#B8CCFF",
      colorName: { "zh-TW": "冰藍", en: "ice blue", ja: "アイスブルー", de: "Eisblau" },
      number: 7,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "靜下來的時候,線索才會出現",
        body: "今天不要把時間填滿。留一個空隙,答案會自己走過來。",
      },
      en: {
        headline: "The clue arrives only when you sit still",
        body: "Don't fill every hour today. Leave a gap. The answer walks in on its own.",
      },
      ja: {
        headline: "静かにしているときに、ヒントは現れる",
        body: "今日、時間を詰め込まないで。隙間を一つ残せば、答えはひとりでに歩いてくる。",
      },
      de: {
        headline: "Der Hinweis kommt, wenn du still wirst",
        body: "Verplane heute nicht jede Stunde. Lass eine Lücke. Die Antwort kommt von selbst vorbei.",
      },
    },
  },
  {
    id: "lucky-07",
    tier: "lucky",
    voice: "playful",
    memberId: "random",
    lucky: {
      color: "#FFB84A",
      colorName: { "zh-TW": "暖金", en: "warm gold", ja: "ウォームゴールド", de: "Warmgold" },
      number: 1,
      track: "Ignite!",
    },
    copy: {
      "zh-TW": {
        headline: "今天適合隨便傳一首歌給誰",
        body: "不用解釋。就傳。對方會明白,或者不明白,但你會開心。",
      },
      en: {
        headline: "Today: send a song to someone for no reason",
        body: "Don't explain. Just send. They'll get it, or they won't, but you'll be glad you did.",
      },
      ja: {
        headline: "今日は、理由なく誰かに曲を送る日",
        body: "説明はいらない。ただ送る。相手はわかるか、わからないかだけど、君は嬉しくなる。",
      },
      de: {
        headline: "Heute: schick jemandem ohne Grund einen Song",
        body: "Kein Erklären. Einfach senden. Sie verstehen's, oder nicht — aber du wirst froh sein, dass du's getan hast.",
      },
    },
  },
];

/**
 * Weighted random draw. Uses a seedable RNG so we can deterministically reroll
 * for the same day if we ever want to (currently: one pull per calendar day,
 * localStorage keeps the result).
 */
export function drawFortune(rng: () => number = Math.random): Fortune {
  // Step 1: pick tier by weight.
  const r = rng();
  let tier: Tier;
  if (r < TIER_WEIGHTS.super) tier = "super";
  else if (r < TIER_WEIGHTS.super + TIER_WEIGHTS.very) tier = "very";
  else tier = "lucky";

  // Step 2: uniform pick within tier.
  const pool = FORTUNES.filter((f) => f.tier === tier);
  const idx = Math.floor(rng() * pool.length);
  return pool[idx] ?? pool[0]!;
}

/** Day key in local time; stable across a calendar day regardless of when opened. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
