// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  authLinks,
  pixelLifeApi,
  type Member,
  type RewardData,
  type RewardPlant,
  type TestBoard,
  type TestUser,
} from "./api";

type Locale = "en" | "ko" | "zh" | "ja";
const gradeNames: Record<Locale, Record<string, string>> = {
  en: { SEED: "Seed", SPROUT: "Sprout", GROVE: "Grove", GARDENER: "Gardener", BOTANIST: "Botanist", CONSERVATOR: "Conservator" },
  ko: { SEED: "씨앗", SPROUT: "새싹", GROVE: "숲", GARDENER: "정원사", BOTANIST: "식물학자", CONSERVATOR: "보존가" },
  zh: { SEED: "种子", SPROUT: "新芽", GROVE: "树林", GARDENER: "园丁", BOTANIST: "植物学家", CONSERVATOR: "守护者" },
  ja: { SEED: "種", SPROUT: "芽", GROVE: "木立", GARDENER: "庭師", BOTANIST: "植物学者", CONSERVATOR: "保全者" },
};
type InputType = "level" | "check" | "mood";
type Entry = { date: string; value: number; note?: string; emoji?: string };
type Board = {
  id: string;
  title: string;
  inputType: InputType;
  startDate: string;
  targetEndDate?: string | null;
  createdAt: string;
  goalDays: number | null;
  entries: Entry[];
  color: string;
  rewardSpeciesCode?: string;
  rewardSpeciesName?: string;
  rewardSpeciesSymbol?: string;
  rewardColorCode?: string;
  status?: "ACTIVE" | "COMPLETED";
  finalScore?: number | null;
  xpAwarded?: number;
};
type View =
  | "home"
  | "detail"
  | "setup"
  | "active-list"
  | "finished-list"
  | "garden-list"
  | "conservatory-list"
  | "guide"
  | "rewards"
  | "account"
  | "privacy"
  | "terms"
  | "admin";

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={`brand-mark ${large ? "large" : ""}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#f3f0e8" />
      <path fill="#159651" d="M14 40h12V28h12V16h12v12H38v12H26v10H14z" />
      <rect x="38" y="40" width="12" height="10" rx="2" fill="#20241f" />
    </svg>
  );
}

const words = {
  en: {
    hello: "GOOD TO SEE YOU",
    headline: "Your small things\nare adding up.",
    sub: "Pick a board and add today.",
    new: "＋ New board",
    active: "active",
    archived: "Completed boards",
    archiveHelp: "Your completed boards stay here.",
    day: "DAY",
    ready: "Ready to start",
    missed: "days missed · Start again today",
    done: "days done",
    wins: "wins",
    plus: "Plus is on",
    plusSub: "Up to 30 active boards",
    myBoards: "My boards",
    back: "← My boards",
    newBoard: "NEW BOARD",
    question: "What do you want\nto keep doing?",
    name: "Board name",
    period: "Goal length",
    endless: "Endless",
    make: "Make board",
    cancel: "Cancel",
    board: "BOARD",
    rolling: "13 WEEK BOARD",
    first: "Today can be your first pixel.",
    again: "One win still counts. Begin again.",
    moving: "The board moves with today. Your history stays safe.",
    today: "TODAY",
    how: "How was today?",
    change: "You can change it any time.",
    pick: "Pick 1 to 5. There is no bad score.",
    note: "Short note",
    optional: "optional",
    placeholder: "One small thing",
    save: "Save today",
    saved: "Saved ✓",
    daysDone: "Days done",
    daysMissed: "Days missed",
    keep: "Keep rate",
    boardTab: "Board",
    stats: "Stats",
    older: "Older board",
    newer: "Newer board",
    scroll: "Swipe or use the buttons",
    noteTitle: "Note on",
    noNote: "No note for this day.",
    weekRate: "This week",
    average: "Avg. level",
    best: "Best week",
    milestones: "Current streak",
    reached: "active",
    next: "next",
    local: "Dates use your local time.",
  },
  ko: {
    hello: "다시 만나 반가워요",
    headline: "작은 일들이\n차곡차곡 쌓이고 있어요.",
    sub: "보드를 골라 오늘을 기록하세요.",
    new: "＋ 새 보드",
    active: "진행 중",
    archived: "완료된 보드",
    archiveHelp: "끝난 보드는 여기에서 다시 볼 수 있어요.",
    day: "일차",
    ready: "시작할 준비가 됐어요",
    missed: "일 놓침 · 오늘 다시 시작해요",
    done: "일 기록",
    wins: "회 기록",
    plus: "Plus 이용 중",
    plusSub: "활성 보드 최대 30개",
    myBoards: "진행 중 보드",
    back: "← 진행 중 보드",
    newBoard: "새 보드",
    question: "무엇을 꾸준히\n하고 싶나요?",
    name: "보드 이름",
    period: "목표 기간",
    endless: "무기한",
    make: "보드 만들기",
    cancel: "취소",
    board: "보드",
    rolling: "13주 보드",
    first: "오늘 첫 픽셀을 만들 수 있어요.",
    again: "한 번의 성공도 소중해요. 오늘 다시 시작해요.",
    moving: "오늘을 기준으로 보드가 이동하며 기록은 보존돼요.",
    today: "오늘",
    how: "오늘은 어땠나요?",
    change: "언제든 오늘 기록을 바꿀 수 있어요.",
    pick: "1부터 5까지 골라요. 나쁜 점수는 없어요.",
    note: "짧은 메모",
    optional: "선택",
    placeholder: "오늘의 작은 일",
    save: "오늘 저장",
    saved: "저장됨 ✓",
    daysDone: "기록한 날",
    daysMissed: "놓친 날",
    keep: "기록률",
    boardTab: "보드",
    stats: "통계",
    older: "이전 보드",
    newer: "다음 보드",
    scroll: "스와이프하거나 버튼으로 이동",
    noteTitle: "이날의 메모",
    noNote: "이날 작성한 메모가 없어요.",
    weekRate: "이번 주",
    average: "평균 단계",
    best: "최고의 주",
    milestones: "현재 연속 기록",
    reached: "적용 중",
    next: "다음",
    local: "사용자 현지 날짜를 기준으로 해요.",
  },
  zh: {
    hello: "很高兴再次见到你",
    headline: "每一件小事\n都在慢慢累积。",
    sub: "选择一个面板，记录今天。",
    new: "＋ 新面板",
    active: "进行中",
    archived: "已完成面板",
    archiveHelp: "完成的面板会保存在这里。",
    day: "第",
    ready: "准备开始",
    missed: "天未记录 · 今天重新开始",
    done: "天已记录",
    wins: "次记录",
    plus: "Plus 已启用",
    plusSub: "最多30个活动面板",
    myBoards: "我的面板",
    back: "← 我的面板",
    newBoard: "新面板",
    question: "你想坚持做\n什么？",
    name: "面板名称",
    period: "目标天数",
    endless: "无限",
    make: "创建面板",
    cancel: "取消",
    board: "面板",
    rolling: "13周面板",
    first: "今天可以点亮第一个像素。",
    again: "一次成功也很重要。今天重新开始。",
    moving: "面板随今天移动，历史记录会保留。",
    today: "今天",
    how: "今天怎么样？",
    change: "你可以随时修改今天。",
    pick: "选择1到5，没有坏分数。",
    note: "简短笔记",
    optional: "可选",
    placeholder: "今天的一件小事",
    save: "保存今天",
    saved: "已保存 ✓",
    daysDone: "记录天数",
    daysMissed: "未记录",
    keep: "完成率",
    boardTab: "面板",
    stats: "统计",
    older: "更早面板",
    newer: "更新面板",
    scroll: "滚动或滑动查看更多",
    noteTitle: "当天笔记",
    noNote: "这一天没有笔记。",
    weekRate: "本周",
    average: "平均等级",
    best: "最佳一周",
    milestones: "里程碑",
    reached: "已达成",
    next: "下一个",
    local: "日期以你的本地时间为准。",
  },
  ja: {
    hello: "また会えてうれしいです",
    headline: "小さなことが\n積み重なっています。",
    sub: "ボードを選んで今日を記録しましょう。",
    new: "＋ 新しいボード",
    active: "進行中",
    archived: "完了したボード",
    archiveHelp: "完了したボードはここで見返せます。",
    day: "日目",
    ready: "始める準備ができました",
    missed: "日未記録 · 今日から再開",
    done: "日記録",
    wins: "回記録",
    plus: "Plus 利用中",
    plusSub: "アクティブボード最大30個",
    myBoards: "マイボード",
    back: "← マイボード",
    newBoard: "新しいボード",
    question: "何を続けたい\nですか？",
    name: "ボード名",
    period: "目標期間",
    endless: "無期限",
    make: "ボードを作る",
    cancel: "キャンセル",
    board: "ボード",
    rolling: "13週間ボード",
    first: "今日、最初のピクセルを作れます。",
    again: "一度の成功も大切です。今日から再開。",
    moving: "今日を基準にボードが動き、履歴は残ります。",
    today: "今日",
    how: "今日はどうでしたか？",
    change: "今日の記録はいつでも変更できます。",
    pick: "1から5を選びます。悪い点数はありません。",
    note: "短いメモ",
    optional: "任意",
    placeholder: "今日の小さなこと",
    save: "今日を保存",
    saved: "保存しました ✓",
    daysDone: "記録した日",
    daysMissed: "未記録日",
    keep: "記録率",
    boardTab: "ボード",
    stats: "統計",
    older: "前のボード",
    newer: "次のボード",
    scroll: "スクロールまたはスワイプ",
    noteTitle: "この日のメモ",
    noNote: "この日のメモはありません。",
    weekRate: "今週",
    average: "平均レベル",
    best: "最高の週",
    milestones: "達成記録",
    reached: "達成",
    next: "次",
    local: "日付は端末の現地時間が基準です。",
  },
} as const;

const extraWords: Record<Locale, Record<string, string>> = {
  en: {
    guide: "Guide",
    rewards: "Rewards",
    account: "Account",
    signIn: "Sign in with Google",
    language: "Language",
    close: "Close message",
    home: "← Home",
    loading: "Loading your garden…",
    serverWaking: "The server is waking up. Please try again soon.",
    finish: "Complete board",
    finishConfirm: "Complete this board? You cannot add more records after this.",
    finishError: "Could not complete this board",
    finishLocked: "Available to complete",
    finishRule:
      "Finish after at least 7 calendar days and the goal date. XP is awarded once.",
    readOnly: "READ ONLY",
    recordsSafe: "Your records are safe.",
    freeReadOnly:
      "Free keeps one active board open. Start Plus again to record on this board.",
    startPlus: "Start Plus again",
    recordType: "Record type",
    levelName: "Level",
    levelHelp: "Pick how strong today was",
    checkName: "Yes / No",
    checkHelp: "One simple check each day",
    moodName: "Mood",
    moodHelp: "Pick one emoji each day",
    custom: "Custom",
    customHelp: "Enter your own number",
    customDays: "Custom days",
    days: "days",
    reset: "Reset today",
    didIt: "Did you do it?",
    oneTap: "One tap is enough.",
    feel: "How do you feel?",
    pickMood: "Pick one mood for today.",
    yesDid: "✓ Yes, I did",
    try: "Try",
    light: "Light",
    good: "Good",
    strong: "Strong",
    bestLevel: "Best",
    well: "You are doing well.",
    returnCounts: "Every return counts.",
    restart: "Today is a good restart.",
    recentPrefix: "You recorded",
    recentSuffix: "times in the last 4 weeks.",
    levelsChart: "Your 1–5 levels",
    checkChart: "Done and missed days",
    moodChart: "Your saved moods",
    levelsHelp: "How often you picked each color.",
    checkChartHelp: "A simple view of your check-ins.",
    moodChartHelp: "The moods you chose on recorded days.",
    notRecorded: "not recorded",
    privacy: "Privacy",
    terms: "Terms",
  },
  ko: {
    guide: "이용 가이드",
    rewards: "보상",
    account: "계정",
    signIn: "Google로 로그인",
    language: "언어",
    close: "메시지 닫기",
    home: "← 홈",
    loading: "가든을 불러오는 중…",
    serverWaking: "서버가 깨어나는 중이에요. 잠시 후 다시 시도해 주세요.",
    finish: "보드 완료",
    finishConfirm: "이 보드를 완료할까요? 완료 후에는 기록을 추가할 수 없어요.",
    finishError: "보드를 완료하지 못했어요",
    finishLocked: "완료 가능일",
    finishRule:
      "생성 후 최소 7일과 목표 종료일이 지나야 종료할 수 있으며 XP는 한 번만 지급돼요.",
    readOnly: "읽기 전용",
    recordsSafe: "기록은 안전하게 보관돼요.",
    freeReadOnly:
      "무료 회원은 활성 보드 1개에 기록할 수 있어요. 이 보드에 기록하려면 Plus를 다시 시작하세요.",
    startPlus: "Plus 다시 시작",
    recordType: "기록 방식",
    levelName: "단계",
    levelHelp: "오늘의 정도를 1~5로 선택",
    checkName: "예 / 아니요",
    checkHelp: "하루 한 번 간단히 체크",
    moodName: "기분",
    moodHelp: "오늘의 이모지 하나 선택",
    custom: "직접 입력",
    customHelp: "원하는 일수를 입력하세요",
    customDays: "직접 입력 일수",
    days: "일",
    reset: "오늘 기록 초기화",
    didIt: "오늘 해냈나요?",
    oneTap: "한 번만 누르면 돼요.",
    feel: "오늘 기분은 어때요?",
    pickMood: "오늘의 기분 하나를 골라요.",
    yesDid: "✓ 네, 했어요",
    try: "시도",
    light: "가볍게",
    good: "좋음",
    strong: "강하게",
    bestLevel: "최고",
    well: "잘 이어가고 있어요.",
    returnCounts: "다시 돌아온 것도 기록이에요.",
    restart: "오늘 다시 시작하면 돼요.",
    recentPrefix: "최근 4주 동안",
    recentSuffix: "번 기록했어요.",
    levelsChart: "1~5 단계 분포",
    checkChart: "완료일과 미기록일",
    moodChart: "저장한 기분",
    levelsHelp: "각 색을 몇 번 골랐는지 보여줘요.",
    checkChartHelp: "체크한 날을 간단히 보여줘요.",
    moodChartHelp: "기록한 날의 기분을 보여줘요.",
    notRecorded: "미기록",
    privacy: "개인정보",
    terms: "이용약관",
  },
  zh: {
    guide: "使用指南",
    rewards: "奖励",
    account: "账户",
    signIn: "使用 Google 登录",
    language: "语言",
    close: "关闭消息",
    home: "← 首页",
    loading: "正在加载花园…",
    finish: "完成面板",
    finishConfirm: "要完成此面板吗？完成后无法再添加记录。",
    finishError: "无法完成面板",
    finishLocked: "可完成日期",
    finishRule: "创建至少7天且到达目标日期后才能结束，XP只奖励一次。",
    readOnly: "只读",
    recordsSafe: "你的记录已安全保存。",
    freeReadOnly:
      "免费会员只能记录一个活动面板。重新订阅 Plus 后可记录此面板。",
    startPlus: "重新订阅 Plus",
    recordType: "记录方式",
    levelName: "等级",
    levelHelp: "选择今天的强度1–5",
    checkName: "是 / 否",
    checkHelp: "每天简单打卡一次",
    moodName: "心情",
    moodHelp: "每天选择一个表情",
    custom: "自定义",
    customHelp: "输入自己的天数",
    customDays: "自定义天数",
    days: "天",
    reset: "重置今天",
    didIt: "今天完成了吗？",
    oneTap: "点一次就够了。",
    feel: "今天感觉如何？",
    pickMood: "选择今天的心情。",
    yesDid: "✓ 是的，完成了",
    try: "尝试",
    light: "轻松",
    good: "不错",
    strong: "很棒",
    bestLevel: "最佳",
    well: "你做得很好。",
    returnCounts: "每次回来都算数。",
    restart: "今天适合重新开始。",
    recentPrefix: "最近4周记录了",
    recentSuffix: "次。",
    levelsChart: "你的1–5等级",
    checkChart: "完成和未记录天数",
    moodChart: "保存的心情",
    levelsHelp: "查看每种颜色选择次数。",
    checkChartHelp: "简单查看你的打卡。",
    moodChartHelp: "查看记录日选择的心情。",
    notRecorded: "未记录",
    privacy: "隐私",
    terms: "条款",
  },
  ja: {
    guide: "利用ガイド",
    rewards: "報酬",
    account: "アカウント",
    signIn: "Googleでログイン",
    language: "言語",
    close: "メッセージを閉じる",
    home: "← ホーム",
    loading: "ガーデンを読み込み中…",
    finish: "ボードを完了",
    finishConfirm: "このボードを完了しますか？完了後は記録を追加できません。",
    finishError: "ボードを完了できませんでした",
    finishLocked: "完了できる日",
    finishRule:
      "作成から最低7日かつ目標日以降に終了でき、XPは一度だけ付与されます。",
    readOnly: "読み取り専用",
    recordsSafe: "記録は安全に保存されています。",
    freeReadOnly:
      "無料会員は1つのアクティブボードに記録できます。このボードに記録するにはPlusを再開してください。",
    startPlus: "Plusを再開",
    recordType: "記録方法",
    levelName: "レベル",
    levelHelp: "今日の強さを1〜5で選択",
    checkName: "はい / いいえ",
    checkHelp: "毎日一度だけ簡単チェック",
    moodName: "気分",
    moodHelp: "今日の絵文字を一つ選択",
    custom: "カスタム",
    customHelp: "日数を入力してください",
    customDays: "カスタム日数",
    days: "日",
    reset: "今日をリセット",
    didIt: "今日はできましたか？",
    oneTap: "一回タップするだけです。",
    feel: "今日の気分は？",
    pickMood: "今日の気分を一つ選びます。",
    yesDid: "✓ はい、できました",
    try: "挑戦",
    light: "軽め",
    good: "良い",
    strong: "強い",
    bestLevel: "最高",
    well: "順調です。",
    returnCounts: "戻ってきたことも大切です。",
    restart: "今日は再開に良い日です。",
    recentPrefix: "直近4週間で",
    recentSuffix: "回記録しました。",
    levelsChart: "1〜5レベル",
    checkChart: "完了日と未記録日",
    moodChart: "保存した気分",
    levelsHelp: "各色を選んだ回数です。",
    checkChartHelp: "チェックインを簡単に表示します。",
    moodChartHelp: "記録日に選んだ気分です。",
    notRecorded: "未記録",
    privacy: "プライバシー",
    terms: "利用規約",
  },
} as const;
extraWords.zh.serverWaking = "服务器正在启动，请稍后再试。";
extraWords.ja.serverWaking =
  "サーバーを起動しています。少し待ってからもう一度お試しください。";
extraWords.en.periodEnded = "GOAL PERIOD ENDED";
extraWords.en.periodEndedTitle = "This board is ready to complete.";
extraWords.en.periodEndedHelp =
  "Today's record is closed because the goal date has passed. Review your board and complete it when you are ready.";
extraWords.ko.periodEnded = "목표 기간 완료";
extraWords.ko.periodEndedTitle = "이 보드는 완료할 수 있어요.";
extraWords.ko.periodEndedHelp =
  "목표 종료일이 지나 오늘 기록은 입력할 수 없어요. 기록을 확인한 뒤 보드를 완료해 주세요.";
extraWords.zh.periodEnded = "目标期间已结束";
extraWords.zh.periodEndedTitle = "此面板可以完成了。";
extraWords.zh.periodEndedHelp =
  "目标日期已过，今天无法再记录。请查看记录后完成面板。";
extraWords.ja.periodEnded = "目標期間終了";
extraWords.ja.periodEndedTitle = "このボードは完了できます。";
extraWords.ja.periodEndedHelp =
  "目標終了日を過ぎたため、今日の記録は追加できません。記録を確認してボードを完了してください。";
extraWords.en.finishRule =
  "A goal board can be completed from its middle day. Endless boards open on day 7. XP is awarded once.";
extraWords.ko.finishRule =
  "목표 기간의 중간 일차부터 완료할 수 있어요. 무기한 보드는 7일차부터 가능하며 XP는 한 번만 지급돼요.";
extraWords.zh.finishRule =
  "目标面板经过一半周期后可完成。无限期面板从第7天开放，XP只奖励一次。";
extraWords.ja.finishRule =
  "目標期間の半分を過ぎると完了できます。無期限は7日目からで、XPは一度だけ付与されます。";
extraWords.en.customHelp = "Enter 3 days or more";
extraWords.ko.customHelp = "최소 3일 이상 입력하세요";
extraWords.zh.customHelp = "请输入至少3天";
extraWords.ja.customHelp = "3日以上を入力してください";
extraWords.en.boardNameHint = "e.g. Move my body";
extraWords.ko.boardNameHint = "예: 매일 움직이기";
extraWords.zh.boardNameHint = "例如：每天运动";
extraWords.ja.boardNameHint = "例：毎日体を動かす";
extraWords.en.boardNameRequired = "Enter a board name.";
extraWords.ko.boardNameRequired = "보드 이름을 입력해 주세요.";
extraWords.zh.boardNameRequired = "请输入面板名称。";
extraWords.ja.boardNameRequired = "ボード名を入力してください。";
extraWords.en.noDid = "No, not today";
extraWords.ko.noDid = "아니요, 오늘은 못했어요";
extraWords.zh.noDid = "不，今天没有";
extraWords.ja.noDid = "いいえ、今日はできませんでした";
extraWords.en.plusSub =
  "Up to 10 active boards · Complete and grow rewards without limits";
extraWords.ko.plusSub = "활성 보드 최대 10개 · 완료하며 보상을 계속 쌓아요";
extraWords.zh.plusSub = "最多10个活动面板 · 完成后可持续累积奖励";
extraWords.ja.plusSub = "進行中ボード最大10個 · 完了して報酬を積み重ねます";
extraWords.en.freeReadOnly =
  "Free keeps the 3 most recently used active boards open. Extra boards stay safe and read-only.";
extraWords.ko.freeReadOnly =
  "무료 회원은 최근 사용한 활성 보드 3개를 계속 기록할 수 있어요. 나머지는 안전하게 읽기 전용으로 보관돼요.";
extraWords.zh.freeReadOnly =
  "免费会员可继续记录最近使用的3个活动面板，其余面板安全保留为只读。";
extraWords.ja.freeReadOnly =
  "無料会員は最近使った3個の進行中ボードを記録でき、残りは安全な読み取り専用になります。";
const actionWords: Record<Locale, Record<string, string>> = {
  en: {
    completeBoard: "Complete board",
    completeConfirm:
      "Complete this board? You cannot add more records after this.",
    deleteBoard: "Delete board",
    deleteConfirm:
      "Delete this active board and all its records? This cannot be undone.",
    deleteError: "Could not delete this board",
    deleteHelp: "Delete this unfinished board to make a new one.",
    accountLoadError: "Could not load your account data.",
    importGuest: "Save {count} guest boards to this membership?",
    rewardsLoadError: "Could not load rewards.",
    resetError: "Could not reset today.",
    createError: "Could not create the board.",
    saveError: "Could not save today.",
    billingError: "Could not open billing.",
    checkoutError: "Checkout is not ready yet.",
    sessionEnded: "Your session ended. Please sign in again.",
    withdrawConfirm:
      "Leave PixelLife? Every board, record, plant, badge, and XP will be permanently removed.",
    withdrawFinal: "Your canceled subscription stays scheduled in Polar, but PixelLife access and data end now without an automatic refund. Do you still want to leave?",
    withdrawError: "Could not complete membership withdrawal.",
    withdrawBlocked: "Cancel Plus in billing first. After cancellation is scheduled, you can leave whenever you want.",
    badgeListLabel: "View my badges",
    growthLabel: "My growth",
    badgeUnit: "badges",
    supportLabel: "Email support",
  },
  ko: {
    completeBoard: "보드 완료",
    completeConfirm:
      "이 보드를 완료할까요? 완료 후에는 기록을 추가할 수 없어요.",
    deleteBoard: "보드 삭제",
    deleteConfirm: "이 활성 보드와 모든 기록을 삭제할까요? 되돌릴 수 없어요.",
    deleteError: "보드를 삭제하지 못했어요",
    deleteHelp: "완료하지 않은 보드를 삭제하고 새 보드를 만들 수 있어요.",
    accountLoadError: "계정 데이터를 불러오지 못했어요.",
    importGuest: "비회원 보드 {count}개를 이 회원 정보에 저장할까요?",
    rewardsLoadError: "보상 정보를 불러오지 못했어요.",
    resetError: "오늘 기록을 초기화하지 못했어요.",
    createError: "보드를 만들지 못했어요.",
    saveError: "오늘 기록을 저장하지 못했어요.",
    billingError: "결제 관리 화면을 열지 못했어요.",
    checkoutError: "결제 화면을 준비하지 못했어요.",
    sessionEnded: "로그인이 만료됐어요. 다시 로그인해 주세요.",
    withdrawConfirm:
      "PixelLife에서 탈퇴할까요? 모든 보드, 기록, 식물, 배지와 XP가 영구 삭제돼요.",
    withdrawFinal: "Polar 구독 해지 예약은 그대로 유지되지만 PixelLife 이용과 데이터는 지금 종료되며 자동 환불되지 않아요. 그래도 탈퇴할까요?",
    withdrawError: "회원 탈퇴를 완료하지 못했어요.",
    withdrawBlocked: "결제 관리에서 Plus를 먼저 해지해 주세요. 해지 예약 후에는 원하는 때 바로 탈퇴할 수 있어요.",
    badgeListLabel: "내 배지 목록 보기",
    growthLabel: "나의 성장",
    badgeUnit: "배지",
    supportLabel: "이메일 문의",
  },
  zh: {
    completeBoard: "完成面板",
    completeConfirm: "要完成此面板吗？完成后无法再添加记录。",
    deleteBoard: "删除面板",
    deleteConfirm: "要删除此活动面板和全部记录吗？此操作无法撤销。",
    deleteError: "无法删除面板",
    deleteHelp: "删除未完成的面板后可以创建新面板。",
    accountLoadError: "无法加载账户数据。",
    importGuest: "要将{count}个访客面板保存到此会员账户吗？",
    rewardsLoadError: "无法加载奖励信息。",
    resetError: "无法重置今天的记录。",
    createError: "无法创建面板。",
    saveError: "无法保存今天的记录。",
    billingError: "无法打开付款管理页面。",
    checkoutError: "结账页面尚未准备好。",
    sessionEnded: "登录已过期，请重新登录。",
    withdrawConfirm:
      "要退出PixelLife会员吗？所有面板、记录、植物、徽章和XP都将永久删除。",
    withdrawFinal: "Polar中的订阅取消预约会保留，但PixelLife使用权限和数据会立即结束且不会自动退款。仍要退出吗？",
    withdrawError: "无法完成会员注销。",
    withdrawBlocked: "请先在付款管理中取消Plus。预约取消后可随时退出会员。",
    badgeListLabel: "查看我的徽章",
    growthLabel: "我的成长",
    badgeUnit: "枚徽章",
    supportLabel: "邮件咨询",
  },
  ja: {
    completeBoard: "ボードを完了",
    completeConfirm: "このボードを完了しますか？完了後は記録を追加できません。",
    deleteBoard: "ボードを削除",
    deleteConfirm:
      "この進行中ボードとすべての記録を削除しますか？元に戻せません。",
    deleteError: "ボードを削除できませんでした",
    deleteHelp: "未完了のボードを削除して新しいボードを作れます。",
    accountLoadError: "アカウントデータを読み込めませんでした。",
    importGuest: "ゲストボード{count}個をこの会員情報に保存しますか？",
    rewardsLoadError: "報酬情報を読み込めませんでした。",
    resetError: "今日の記録をリセットできませんでした。",
    createError: "ボードを作成できませんでした。",
    saveError: "今日の記録を保存できませんでした。",
    billingError: "支払い管理画面を開けませんでした。",
    checkoutError: "決済画面を準備できませんでした。",
    sessionEnded: "ログインの有効期限が切れました。もう一度ログインしてください。",
    withdrawConfirm:
      "PixelLifeを退会しますか？すべてのボード、記録、植物、バッジ、XPが完全に削除されます。",
    withdrawFinal: "Polarの解約予約は維持されますが、PixelLifeの利用とデータは直ちに終了し、自動返金はありません。それでも退会しますか？",
    withdrawError: "退会を完了できませんでした。",
    withdrawBlocked: "先に支払い管理でPlusを解約してください。解約予約後はいつでも退会できます。",
    badgeListLabel: "獲得したバッジを見る",
    growthLabel: "成長記録",
    badgeUnit: "個のバッジ",
    supportLabel: "メール問い合わせ",
  },
};
const boardLimitWords: Record<Locale, (plan: string, limit: number) => string> = {
  en: (plan, limit) => `${plan} members can have up to ${limit} active boards. Complete or delete one before making another.`,
  ko: (plan, limit) => `${plan} 회원은 활성 보드를 최대 ${limit}개까지 만들 수 있어요. 기존 보드를 완료하거나 삭제한 뒤 새로 만들어 주세요.`,
  zh: (plan, limit) => `${plan}会员最多可拥有${limit}个活动面板。请先完成或删除一个面板。`,
  ja: (plan, limit) => `${plan}会員が利用できる進行中ボードは最大${limit}個です。既存のボードを完了または削除してから作成してください。`,
};
const screenWords: Record<Locale, Record<string, string>> = {
  en: {
    allActive: "All active boards",
    complete: "complete",
    allFinished: "All completed boards",
    completedMove: "Completed boards move their plants to the Conservatory.",
    needBoards: "Need more boards?",
    tryPlus: "Try Plus",
    home: "← Home",
    growing: "GROWING",
    completed: "COMPLETED",
    boards: "boards",
    activeListHelp: "Boards you can record today.",
    finishedListHelp:
      "Completed boards are read-only and their plants stay in the Conservatory.",
    pixelGarden: "PIXEL GARDEN",
    conservatory: "CONSERVATORY",
    growingPlants: "Growing plants",
    collection: "My plant collection",
    newFirst: "A new board always appears first.",
    permanent: "Every completed board becomes a permanent specimen.",
    memberRewards: "MEMBER REWARDS",
    guestRewardTitle: "Keep your garden after you leave.",
    guestRewardHelp:
      "Sign in to earn plants, badges, and grades. Guest records stay only in this browser.",
    readOnly: "Read only",
    records: "records",
    stage: "Stage",
    points: "points",
    gardenTitle: "Your boards grow here.",
    gardenHelp: "One board grows one plant. New plants come first.",
    allGrowing: "All growing plants",
    completedPlants: "All completed plants.",
    completedPlantsHelp: "These are the plants earned from completed boards.",
    openCollection: "Open full collection",
    list: "List",
    map: "Map",
    plants: "plants",
    emptyPlants: "Complete a board to collect your first plant.",
    fit: "Fit",
  },
  ko: {
    allActive: "전체 진행 보드",
    complete: "완료",
    allFinished: "전체 완료 보드",
    completedMove: "완료된 보드의 식물은 식물원으로 이동해요.",
    needBoards: "보드가 더 필요한가요?",
    tryPlus: "Plus 시작",
    home: "← 홈",
    growing: "성장 중",
    completed: "완료",
    boards: "개 보드",
    activeListHelp: "오늘 기록할 수 있는 보드예요.",
    finishedListHelp: "완료된 보드는 읽기 전용이며 식물은 식물원에 보관돼요.",
    pixelGarden: "픽셀 가든",
    conservatory: "식물원",
    growingPlants: "성장 중인 식물",
    collection: "내 식물 컬렉션",
    newFirst: "새 보드가 항상 먼저 보여요.",
    permanent: "완료한 모든 보드는 영구 식물 표본이 돼요.",
    memberRewards: "회원 보상",
    guestRewardTitle: "떠난 뒤에도 가든을 보관하세요.",
    guestRewardHelp:
      "로그인하면 식물, 배지, 등급을 얻어요. 비회원 기록은 이 브라우저에만 남아요.",
    readOnly: "읽기 전용",
    records: "개 기록",
    stage: "단계",
    points: "점",
    gardenTitle: "내 보드가 여기에서 자라요.",
    gardenHelp: "보드 하나가 식물 하나를 키워요. 새 식물이 먼저 보여요.",
    allGrowing: "성장 식물 전체",
    completedPlants: "완료한 모든 식물",
    completedPlantsHelp: "완료한 보드에서 실제로 얻은 식물이에요.",
    openCollection: "전체 컬렉션 열기",
    list: "목록",
    map: "지도",
    plants: "개 식물",
    emptyPlants: "보드를 완료하면 첫 식물을 얻어요.",
    fit: "맞춤",
  },
  zh: {
    allActive: "全部活动面板",
    complete: "已完成",
    allFinished: "全部已完成面板",
    completedMove: "已完成面板的植物会移入植物园。",
    needBoards: "需要更多面板吗？",
    tryPlus: "开通 Plus",
    home: "← 首页",
    growing: "成长中",
    completed: "已完成",
    boards: "个面板",
    activeListHelp: "今天可以记录的面板。",
    finishedListHelp: "已完成面板为只读，植物保存在植物园。",
    pixelGarden: "像素花园",
    conservatory: "植物园",
    growingPlants: "成长中的植物",
    collection: "我的植物收藏",
    newFirst: "新面板始终显示在前面。",
    permanent: "每个已完成面板都会成为永久标本。",
    memberRewards: "会员奖励",
    guestRewardTitle: "离开后也能保存花园。",
    guestRewardHelp: "登录后可获得植物、徽章和等级。访客记录只保存在此浏览器。",
    readOnly: "只读",
    records: "条记录",
    stage: "阶段",
    points: "分",
    gardenTitle: "你的面板在这里成长。",
    gardenHelp: "一个面板培育一株植物，新植物优先显示。",
    allGrowing: "全部成长植物",
    completedPlants: "全部已完成植物",
    completedPlantsHelp: "这些是完成面板后真正获得的植物。",
    openCollection: "打开全部收藏",
    list: "列表",
    map: "地图",
    plants: "株植物",
    emptyPlants: "完成一个面板即可获得第一株植物。",
    fit: "适合",
  },
  ja: {
    allActive: "すべての進行中ボード",
    complete: "完了",
    allFinished: "すべての完了ボード",
    completedMove: "完了したボードの植物は温室へ移ります。",
    needBoards: "ボードを増やしますか？",
    tryPlus: "Plusを始める",
    home: "← ホーム",
    growing: "成長中",
    completed: "完了",
    boards: "ボード",
    activeListHelp: "今日記録できるボードです。",
    finishedListHelp: "完了ボードは読み取り専用で、植物は温室に残ります。",
    pixelGarden: "ピクセルガーデン",
    conservatory: "温室",
    growingPlants: "成長中の植物",
    collection: "植物コレクション",
    newFirst: "新しいボードが最初に表示されます。",
    permanent: "完了したボードは永久標本になります。",
    memberRewards: "会員報酬",
    guestRewardTitle: "離れた後もガーデンを残せます。",
    guestRewardHelp:
      "ログインすると植物、バッジ、等級を獲得できます。ゲスト記録はこのブラウザだけに残ります。",
    readOnly: "読み取り専用",
    records: "件の記録",
    stage: "段階",
    points: "点",
    gardenTitle: "ボードがここで育ちます。",
    gardenHelp:
      "一つのボードが一つの植物を育て、新しい植物が先に表示されます。",
    allGrowing: "成長中をすべて表示",
    completedPlants: "完了したすべての植物",
    completedPlantsHelp: "完了ボードから実際に獲得した植物です。",
    openCollection: "全コレクションを開く",
    list: "一覧",
    map: "地図",
    plants: "株",
    emptyPlants: "ボードを完了すると最初の植物を獲得できます。",
    fit: "全体",
  },
};
screenWords.en.needBoards = "Support PixelLife";
screenWords.en.tryPlus = "Support with Plus";
screenWords.ko.needBoards = "PixelLife를 응원해 주세요";
screenWords.ko.tryPlus = "Plus로 후원";
screenWords.zh.needBoards = "支持 PixelLife";
screenWords.zh.tryPlus = "使用 Plus 支持";
screenWords.ja.needBoards = "PixelLifeを応援";
screenWords.ja.tryPlus = "Plusで応援";

const pad = (n: number) => String(n).padStart(2, "0");
const day = (offset = 0) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};
const key = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = key(day());
const BOARD_PAGE_DAYS = 35;
const diff = (a: string, b: string) =>
  Math.floor(
    (new Date(`${b}T12:00:00`).getTime() -
      new Date(`${a}T12:00:00`).getTime()) /
      86400000,
  );
const endDate = (board: Board) =>
  board.targetEndDate ||
  (board.goalDays
    ? key(
        (() => {
          const d = new Date(`${board.startDate}T12:00:00`);
          d.setDate(d.getDate() + board.goalDays - 1);
          return d;
        })(),
      )
    : null);
const isFinished = (board: Board) => board.status === "COMPLETED";
const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
const GUEST_BOARD_KEY = "pixellife-guest-board-v1";
const LOCALE_KEY = "pixellife-locale";
const REWARDS_CACHE_PREFIX = "pixellife-rewards-";
const ENTRIES_CACHE_PREFIX = "pixellife-entries-";
const loadLocale = (): Locale => {
  const saved = localStorage.getItem(LOCALE_KEY);
  return saved === "ko" || saved === "zh" || saved === "ja" ? saved : "en";
};
const loadGuestBoards = (): Board[] => {
  try {
    const value = localStorage.getItem(GUEST_BOARD_KEY);
    const saved = value ? JSON.parse(value) : [];
    const list = Array.isArray(saved) ? saved : saved ? [saved] : [];
    return list.map((board: Board) => ({
      ...board,
      createdAt: board.createdAt || board.startDate,
    }));
  } catch {
    return [];
  }
};
const emptyBoard: Board = {
  id: "",
  title: "",
  inputType: "level",
  startDate: today,
  createdAt: today,
  goalDays: null,
  entries: [],
  color: "#159651",
  status: "ACTIVE",
};
const fromApiBoard = (b: any, entries: any[] = []): Board => ({
  id: String(b.id),
  title: b.name,
  inputType:
    b.boardType === "CHECK"
      ? "check"
      : b.boardType === "MOOD"
        ? "mood"
        : "level",
  startDate: b.startDate,
  targetEndDate: b.endedAt || null,
  createdAt: (b.createdAt || b.startDate).slice(0, 10),
  goalDays: b.goalDays,
  entries: entries.map((e) => ({
    date: e.entryDate,
    value: e.numericValue ?? (e.success ? 1 : 0),
    note: e.note || undefined,
    emoji: e.emoji || undefined,
  })),
  color: b.color,
  rewardSpeciesCode: b.rewardSpeciesCode,
  rewardSpeciesName: b.rewardSpeciesName,
  rewardSpeciesSymbol: b.rewardSpeciesSymbol,
  rewardColorCode: b.rewardColorCode,
  status: b.status,
  finalScore: b.finalScore,
  xpAwarded: b.xpAwarded || 0,
});

function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const progress = {
    en: "IN PROGRESS",
    ko: "진행 중",
    zh: "进行中",
    ja: "進行中",
  }[locale];
  const t = {
    ...words[locale],
    ...extraWords[locale],
    ...actionWords[locale],
    ...screenWords[locale],
    rolling: progress,
  } as unknown as Record<string, string> & typeof words.en;
  const [member, setMember] = useState<Member | null | undefined>(undefined);
  const [rewards, setRewards] = useState<RewardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [boards, setBoards] = useState<Board[]>(loadGuestBoards);
  const [selected, setSelected] = useState("");
  const detailReturnView = useRef<View>("home");
  const [view, setView] = useState<View>(() =>
    location.hash === "#test" ? "admin" : "home",
  );
  const viewScrollY = useRef<Partial<Record<View, number>>>({ home: 0 });
  const navigate = (next: View, reset = false) => {
    if (next === view) return;
    viewScrollY.current[view] = window.scrollY;
    if (reset) viewScrollY.current[next] = 0;
    setView(next);
  };
  useEffect(() => {
    const restore = () =>
      window.scrollTo({ top: viewScrollY.current[view] ?? 0 });
    const frame = requestAnimationFrame(() => requestAnimationFrame(restore));
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [view]);
  const importAsked = useRef(false);
  useEffect(() => {
    let alive = true;
    let retryTimer = 0;
    let retryCount = 0;
    const load = async () => {
      const guest = loadGuestBoards();
      try {
        let data = await pixelLifeApi.bootstrap(locale);
        let account = data.member;
        const guestActive = guest.filter((b) => !isFinished(b)).slice(0, 3);
        const hasAccountBoards = data.boards.length > 0;
        const freeSlots = Math.max(
          0,
          account.activeBoardLimit -
            data.boards.filter((b) => b.status === "ACTIVE").length,
        );
        if (hasAccountBoards && guest.length)
          localStorage.removeItem(GUEST_BOARD_KEY);
        if (
          !hasAccountBoards &&
          !importAsked.current &&
          guestActive.length &&
          freeSlots > 0
        ) {
          importAsked.current = true;
          const sources = guestActive.slice(0, freeSlots);
          if (
            confirm(
              actionWords[locale].importGuest.replace(
                "{count}",
                String(sources.length),
              ),
            )
          ) {
            for (const source of sources)
              await pixelLifeApi.importGuestBoard({
                name: source.title,
                type:
                  source.inputType === "check"
                    ? "CHECK"
                    : source.inputType === "mood"
                      ? "MOOD"
                      : "LEVEL",
                startDate: source.startDate,
                goalDays: source.goalDays,
                entries: source.entries.map((e) => ({
                  date: e.date,
                  value: source.inputType === "level" ? e.value : undefined,
                  success:
                    source.inputType === "check" ? e.value > 0 : undefined,
                  emoji: source.inputType === "mood" ? e.emoji : undefined,
                  note: e.note,
                })),
              });
            localStorage.removeItem(GUEST_BOARD_KEY);
            data = await pixelLifeApi.bootstrap(locale);
            account = data.member;
          }
        }
        let loaded: Board[];
        if (Array.isArray(data.entries)) {
          const entriesByBoard = new Map<number, typeof data.entries>();
          data.entries.forEach((entry) => {
            const entries = entriesByBoard.get(entry.boardId) || [];
            entries.push(entry);
            entriesByBoard.set(entry.boardId, entries);
          });
          loaded = data.boards.map((b) =>
            fromApiBoard(b, entriesByBoard.get(b.id) || []),
          );
        } else {
          loaded = data.boards.map((b) => fromApiBoard(b, []));
        }
        if (!alive) return;
        retryCount = 0;
        setNotice((current) =>
          current === extraWords[locale].serverWaking ? "" : current,
        );
        setMember(account);
        const rewardsCacheKey = `${REWARDS_CACHE_PREFIX}${account.id}`;
        const entriesCacheKey = `${ENTRIES_CACHE_PREFIX}${account.id}`;
        if (!data.rewards) {
          try {
            const cached = localStorage.getItem(rewardsCacheKey);
            if (cached) setRewards(JSON.parse(cached));
          } catch {
            localStorage.removeItem(rewardsCacheKey);
          }
        }
        if (!Array.isArray(data.entries)) {
          try {
            const cached = localStorage.getItem(entriesCacheKey);
            if (cached) {
              const cachedEntries = JSON.parse(cached);
              const cachedByBoard = new Map<number, any[]>();
              cachedEntries.forEach((entry: any) => {
                const boardEntries = cachedByBoard.get(entry.boardId) || [];
                boardEntries.push(entry);
                cachedByBoard.set(entry.boardId, boardEntries);
              });
              loaded = data.boards.map((item) =>
                fromApiBoard(item, cachedByBoard.get(item.id) || []),
              );
            }
          } catch {
            localStorage.removeItem(entriesCacheKey);
          }
        }
        if (data.rewards) setRewards(data.rewards);
        else
          pixelLifeApi
            .rewards()
            .then((nextRewards) => {
              if (alive) {
                setRewards(nextRewards);
                localStorage.setItem(rewardsCacheKey, JSON.stringify(nextRewards));
              }
            })
            .catch((error) =>
              console.error("PixelLife rewards load failed", error),
            );
        setBoards(loaded);
        setSelected((v) =>
          loaded.some((b) => b.id === v) ? v : loaded[0]?.id || "",
        );
        if (!Array.isArray(data.entries))
          pixelLifeApi
            .entries()
            .then((entries) => {
              if (!alive) return;
              localStorage.setItem(entriesCacheKey, JSON.stringify(entries));
              const entriesByBoard = new Map<number, typeof entries>();
              entries.forEach((entry) => {
                const boardEntries = entriesByBoard.get(entry.boardId) || [];
                boardEntries.push(entry);
                entriesByBoard.set(entry.boardId, boardEntries);
              });
              setBoards(
                data.boards.map((item) =>
                  fromApiBoard(item, entriesByBoard.get(item.id) || []),
                ),
              );
            })
            .catch((error) =>
              console.error("PixelLife entries load failed", error),
            );
      } catch (error) {
        if (!alive) return;
        if (error instanceof ApiError && error.status !== 0)
          setNotice((current) =>
            current === extraWords[locale].serverWaking ? "" : current,
          );
        if (error instanceof ApiError && error.status === 0) {
          setNotice(extraWords[locale].serverWaking);
          if (retryCount < 5) {
            retryCount += 1;
            retryTimer = window.setTimeout(load, 2500);
            return;
          }
        }
        setMember(null);
        setRewards(null);
        setBoards(guest);
        setSelected(guest[0]?.id || "");
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error("PixelLife initial load failed", error);
          setNotice(actionWords[locale].accountLoadError);
        }
      }
    };
    load();
    return () => {
      alive = false;
      window.clearTimeout(retryTimer);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
    if (member)
      pixelLifeApi
        .me(locale)
        .then(setMember)
        .catch(() => {});
  }, [locale]);
  useEffect(() => {
    const markLogin = (event: Event) => {
      if ((event.target as Element)?.closest?.(".login-button"))
        sessionStorage.setItem("pixellife.oauth-return", "1");
    };
    document.addEventListener("click", markLogin);
    if (sessionStorage.getItem("pixellife.oauth-return") === "1") {
      sessionStorage.removeItem("pixellife.oauth-return");
      history.replaceState({ pixelLifeOAuthReturn: true }, "", location.href);
      history.pushState({ pixelLifeApp: true }, "", location.href);
    }
    const keepApp = (event: PopStateEvent) => {
      if (event.state?.pixelLifeOAuthReturn) {
        setView("home");
        history.pushState({ pixelLifeApp: true }, "", location.href);
      }
    };
    addEventListener("popstate", keepApp);
    return () => {
      document.removeEventListener("click", markLogin);
      removeEventListener("popstate", keepApp);
    };
  }, []);
  useEffect(() => {
    if (member === null)
      localStorage.setItem(GUEST_BOARD_KEY, JSON.stringify(boards));
  }, [boards, member]);
  useEffect(() => {
    if (view === "rewards" && member && !rewards)
      pixelLifeApi
        .rewards()
        .then(setRewards)
        .catch((error) =>
          showError(error, actionWords[locale].rewardsLoadError),
        );
  }, [view, member, rewards]);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<number | null>(5);
  const [customGoal, setCustomGoal] = useState(45);
  const [inputType, setInputType] = useState<InputType>("level");
  const [level, setLevel] = useState(3);
  const [mood, setMood] = useState("😊");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (customGoal < 3) setCustomGoal(3);
  }, [customGoal]);
  useEffect(() => {
    if (title.length > 24) setTitle(title.slice(0, 24));
  }, [title]);
  useEffect(() => {
    if (view !== "setup") return;
    const input = document.querySelector<HTMLInputElement>(
      ".setup-card label input:not([type])",
    );
    if (input) input.placeholder = t.boardNameHint;
  }, [view, locale, t.boardNameHint]);
  const board =
    boards.find((b) => b.id === selected) || boards[0] || emptyBoard;
  const refreshRewards = async () => {
    if (!member) return;
    const nextRewards = await pixelLifeApi.rewards();
    setRewards(nextRewards);
    localStorage.setItem(`${REWARDS_CACHE_PREFIX}${member.id}`, JSON.stringify(nextRewards));
  };
  const showError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.status === 401) {
      setNotice(actionWords[locale].sessionEnded);
      setMember(null);
    } else if (
      error instanceof ApiError &&
      error.message.includes("Cancel Plus")
    ) {
      setNotice(actionWords[locale].withdrawBlocked);
    } else if (error instanceof Error && locale !== "en") {
      setNotice(fallback);
    } else setNotice(error instanceof Error ? error.message : fallback);
  };
  (t as any).resetToday = async () => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (member) {
        await pixelLifeApi.resetToday(Number(board.id), today);
        void refreshRewards().catch((error) => console.error("PixelLife rewards refresh failed", error));
      }
      setBoards((v) =>
        v.map((b) =>
          b.id === board.id
            ? { ...b, entries: b.entries.filter((e) => e.date !== today) }
            : b,
        ),
      );
      setNote("");
      setSaved(false);
    } catch (error) {
      showError(error, actionWords[locale].resetError);
    } finally {
      setBusy(false);
    }
  };
  (t as any).hasToday = board.entries.some((e) => e.date === today);
  const open = (id: string) => {
    detailReturnView.current =
      view === "active-list" || view === "finished-list" ? view : "home";
    setSelected(id);
    navigate("detail", true);
    setNote("");
    setSaved(false);
  };
  const add = async () => {
    if (busy) return;
    const boardName = title.trim();
    if (!boardName) {
      setNotice(t.boardNameRequired);
      return;
    }
    const activeCount = boards.filter((b) => !isFinished(b)).length;
    const boardLimit = member?.activeBoardLimit || 3;
    if (activeCount >= boardLimit) {
      const plan = member
        ? member.effectivePlan
        : locale === "ko"
          ? "비회원"
          : locale === "zh"
            ? "访客"
            : locale === "ja"
              ? "ゲスト"
              : "Guest";
      setNotice(boardLimitWords[locale](plan, boardLimit));
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const days = goal === -1 ? Math.max(3, customGoal) : goal;
      if (member) {
        const created = await pixelLifeApi.createBoard({
          name: boardName,
          type:
            inputType === "check"
              ? "CHECK"
              : inputType === "mood"
                ? "MOOD"
                : "LEVEL",
          startDate: today,
          goalDays: days,
        });
        const next = fromApiBoard(created);
        setBoards((v) => [next, ...v]);
        setSelected(next.id);
      } else {
        const id = `guest-${Date.now()}`;
        const next: Board = {
          id,
          title: boardName,
          inputType,
          startDate: today,
          createdAt: today,
          goalDays: days,
          entries: [],
          color: "#159651",
          rewardSpeciesCode: "OAK",
          rewardSpeciesName: "Oak",
          rewardSpeciesSymbol: "♣",
          rewardColorCode: "GREEN",
          status: "ACTIVE",
        };
        setBoards((v) => [next, ...v]);
        setSelected(id);
      }
      setTitle("");
      navigate("detail", true);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.message.includes("active board")
      ) {
        const plan = member?.effectivePlan || "Guest";
        setNotice(boardLimitWords[locale](plan, member?.activeBoardLimit || 3));
      } else {
        showError(error, actionWords[locale].createError);
      }
    } finally {
      setBusy(false);
    }
  };
  const save = async (checkSuccess = true) => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    const previousEntries = board.entries;
    try {
      const entry = {
        date: today,
        value:
          board.inputType === "level"
            ? level
            : board.inputType === "check"
              ? checkSuccess
                ? 1
                : 0
              : 1,
        note: note.trim() || undefined,
        emoji: board.inputType === "mood" ? mood : undefined,
      };
      setBoards((v) =>
        v.map((b) =>
          b.id === board.id
            ? {
                ...b,
                entries: [...b.entries.filter((e) => e.date !== today), entry],
              }
            : b,
        ),
      );
      if (member)
        await pixelLifeApi.saveEntry(
          Number(board.id),
          today,
          board.inputType === "level"
            ? { value: level, note: entry.note }
            : board.inputType === "check"
              ? { success: checkSuccess, note: entry.note }
              : { emoji: mood, note: entry.note },
        );
      if (member) void refreshRewards().catch((error) => console.error("PixelLife rewards refresh failed", error));
      setSaved(true);
      setTimeout(() => setSaved(false), 1300);
    } catch (error) {
      setBoards((v) =>
        v.map((b) => (b.id === board.id ? { ...b, entries: previousEntries } : b)),
      );
      showError(error, actionWords[locale].saveError);
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (busy || !confirm(t.completeConfirm)) return;
    setBusy(true);
    setNotice("");
    try {
      if (member) {
        await pixelLifeApi.completeBoard(Number(board.id), today);
        await refreshRewards();
      }
      setBoards((v) =>
        v.map((b) =>
          b.id === board.id
            ? { ...b, status: "COMPLETED", targetEndDate: today }
            : b,
        ),
      );
      navigate("home");
    } catch (error) {
      showError(error, t.finishError);
    } finally {
      setBusy(false);
    }
  };
  const removeBoard = async () => {
    if (busy || !confirm(t.deleteConfirm)) return;
    setBusy(true);
    setNotice("");
    try {
      if (member) {
        await pixelLifeApi.deleteBoard(Number(board.id));
      }
      setBoards((v) => v.filter((b) => b.id !== board.id));
      setSelected("");
      navigate("home");
    } catch (error) {
      showError(error, t.deleteError);
    } finally {
      setBusy(false);
    }
  };
  const upgrade = async () => {
    if (!member) {
      location.href = authLinks.google;
      return;
    }
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const checkout = await pixelLifeApi.createPlusCheckout();
      location.href = checkout.url;
    } catch (error) {
      showError(error, actionWords[locale].checkoutError);
      setBusy(false);
    }
  };
  const active = boards.filter((b) => !isFinished(b)),
    archived = boards.filter(isFinished);
  const plants = member ? rewards?.plants || [] : [];
  const writable = (_b: Board) => true;
  if (member === undefined)
    return (
      <div className="app app-loading" aria-busy="true">
        <div>
          <BrandMark large />
          <b>PixelLife</b>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  return (
    <div className={`app ${busy ? "is-busy" : ""}`} aria-busy={busy}>
      <header>
        <button className="brand" onClick={() => navigate("home")}>
          <BrandMark />
          PixelLife
        </button>
        <div className="plan">
          <nav className={`help-nav ${view === "guide" ? "guide-mode" : ""}`}>
            <button
              className={view === "guide" ? "guide-close" : ""}
              onClick={() =>
                view === "guide" ? navigate("home") : navigate("guide", true)
              }
            >
              {view === "guide" ? t.home : t.guide}
            </button>
          </nav>
          {member ? (
            <>
              <button
                className="reward-status"
                aria-label={actionWords[locale].badgeListLabel}
                onClick={() => navigate("rewards", true)}
              >
                <strong className="grade-chip">
                  {gradeNames[locale][rewards?.gradeCode || "SEED"]}
                </strong>
                <span>
                  <small>{actionWords[locale].growthLabel}</small>
                  <b>{rewards?.totalXp || 0} XP</b>
                </span>
                <em>
                  {rewards?.badges.filter((b) => Boolean(b.earned)).length || 0}{" "}
                  {actionWords[locale].badgeUnit}
                </em>
                <i className="reward-arrow" aria-hidden="true">›</i>
              </button>
              <b>{member.effectivePlan}</b>
              <button
                className="account-link"
                aria-label={t.account}
                title={t.account}
                onClick={() => navigate("account", true)}
              >
                <span className="account-icon" aria-hidden="true" />
                <span className="sr-only">{t.account}</span>
              </button>
            </>
          ) : (
            <a className="login-button" href={authLinks.google}>
              {t.signIn}
            </a>
          )}
          <label className="language">
            <span>◎</span>
            <select
              aria-label={t.language}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">🇺🇸 EN</option>
              <option value="ko">🇰🇷 KO</option>
              <option value="zh">🇨🇳 ZH</option>
              <option value="ja">🇯🇵 JA</option>
            </select>
          </label>
        </div>
      </header>
      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button aria-label={t.close} onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {view === "home" && (
        <main className="home">
          <section className="intro">
            <div>
              <p className="eyebrow">{t.hello}</p>
              <h1>
                {t.headline.split("\n").map((x, i) => (
                  <span key={x}>
                    {x}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h1>
              <p>{t.sub}</p>
            </div>
            <button className="new-button" onClick={() => navigate("setup", true)}>
              {t.new}
            </button>
          </section>
          <section className="section-head">
            <div>
              <h2>{t.myBoards}</h2>
              <span>
                {active.length} {t.active}
              </span>
            </div>
            {active.length > 4 && (
              <button onClick={() => navigate("active-list", true)}>
                {t.allActive} ({active.length}) →
              </button>
            )}
          </section>
          <section className="cards">
            {active.slice(0, 4).map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                t={t}
                locked={!writable(b)}
                onOpen={() => open(b.id)}
              />
            ))}
          </section>
          <Garden
            boards={active}
            plants={plants}
            t={t}
            onGrowing={() => navigate("garden-list", true)}
            onComplete={() => navigate("conservatory-list", true)}
          />
          {archived.length > 0 && (
            <section className="archive">
              <div className="section-head">
                <div>
                  <h2>{t.archived}</h2>
                  <span>
                    {archived.length} {t.complete}
                  </span>
                </div>
                <button onClick={() => navigate("finished-list", true)}>
                  {t.allFinished} ({archived.length}) →
                </button>
              </div>
              <p>{t.completedMove}</p>
              <div className="archive-list">
                {archived.slice(0, 3).map((b) => (
                  <button key={b.id} onClick={() => open(b.id)}>
                    <span>
                      {b.inputType === "level"
                        ? "1–5"
                        : b.inputType === "check"
                          ? "✓ ×"
                          : "☺"}
                    </span>
                    <b>{b.title}</b>
                    <small>
                      {t.period}: {b.goalDays === null ? "∞" : `${b.goalDays} ${t.days}`} · {b.startDate} ~ {endDate(b)}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="plus-summary">
            <div>
              <span className="spark">✦</span>
              <div>
                <b>
                  {member?.effectivePlan === "PLUS" ? t.plus : t.needBoards}
                </b>
                <p>{t.plusSub}</p>
              </div>
            </div>
            {member?.effectivePlan !== "PLUS" && (
              <button onClick={upgrade}>{t.tryPlus}</button>
            )}
          </section>
        </main>
      )}
      {(view === "active-list" || view === "finished-list") && (
        <main className={`board-list-page ${view}`}>
          <button className="back" onClick={() => navigate("home")}>
            {t.home}
          </button>
          <section className="list-title">
            <p className="eyebrow">
              {view === "active-list" ? t.growing : t.completed}
            </p>
            <div className="list-heading">
              <h1>{view === "active-list" ? t.myBoards : t.archived}</h1>
              <b>
                {view === "active-list" ? active.length : archived.length}{" "}
                {t.boards}
              </b>
            </div>
            <p>
              {view === "active-list" ? t.activeListHelp : t.finishedListHelp}
            </p>
          </section>
          <section className="cards">
            {(view === "active-list" ? active : archived).map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                t={t}
                locked={!isFinished(b) && !writable(b)}
                onOpen={() => open(b.id)}
              />
            ))}
          </section>
        </main>
      )}
      {(view === "garden-list" || view === "conservatory-list") && (
        <main className="board-list-page">
          <button className="back" onClick={() => navigate("home")}>
            {t.home}
          </button>
          <section className="list-title">
            <p className="eyebrow">
              {view === "garden-list" ? t.pixelGarden : t.conservatory}
            </p>
            <h1>{view === "garden-list" ? t.growingPlants : t.collection}</h1>
            <p>{view === "garden-list" ? t.newFirst : t.permanent}</p>
          </section>
          <section
            className={`plant-collection ${view === "conservatory-list" ? "completed" : ""}`}
          >
            {view === "garden-list"
              ? active.map((b) => <Plant key={b.id} board={b} t={t} />)
              : plants.map((p) => (
                  <CollectedPlant key={p.id} plant={p} t={t} />
                ))}
          </section>
        </main>
      )}
      {view === "guide" && (
        <>
          <GuidePage
            locale={locale}
            onBack={() => navigate("home")}
            onStart={() => navigate("setup", true)}
            onRewards={() => {}}
          />
          <GuideSamples locale={locale} />
          <GuideRewardCombined locale={locale} />
          <MembershipGuidePlan locale={locale} />
          <GuideGardenActual locale={locale} />
        </>
      )}
      {view === "rewards" &&
        (member ? (
          <RewardsPage
            rewards={rewards}
            locale={locale}
            onBack={() => navigate("home")}
          />
        ) : (
          <main className="guide-page">
            <button className="back" onClick={() => navigate("home")}>
              {t.home}
            </button>
            <section className="guide-hero">
              <p className="eyebrow">{t.memberRewards}</p>
              <h1>{t.guestRewardTitle}</h1>
              <p>{t.guestRewardHelp}</p>
              <a className="login-button" href={authLinks.google}>
                {t.signIn}
              </a>
            </section>
            <RewardPreview locale={locale} />
          </main>
        ))}
      {view === "account" && member && (
        <AccountPage
          member={member}
          locale={locale}
          onBack={() => navigate("home")}
          onUpgrade={upgrade}
          onPortal={async () => {
            if (busy) return;
            setBusy(true);
            try {
              location.href = (await pixelLifeApi.createCustomerPortal()).url;
            } catch (error) {
              showError(error, actionWords[locale].billingError);
            } finally {
              setBusy(false);
            }
          }}
          onDelete={async () => {
            if (!confirm(actionWords[locale].withdrawConfirm))
              return;
            if (!confirm(actionWords[locale].withdrawFinal)) return;
            setBusy(true);
            try {
              await pixelLifeApi.deleteAccount();
              localStorage.removeItem(GUEST_BOARD_KEY);
              location.href = authLinks.logout;
            } catch (error) {
              showError(error, actionWords[locale].withdrawError);
              setBusy(false);
            }
          }}
        />
      )}
      {view === "admin" && member && (
        <TestAdminPage
          locale={locale}
          currentUserId={member.id}
          onBack={() => {
            history.replaceState(null, "", location.pathname);
            navigate("home");
          }}
        />
      )}
      {view === "admin" && !member && (
        <main className="guide-page">
          <section className="guide-hero">
            <p className="eyebrow">ADMIN TEST</p>
            <h1>
              {{
                en: "Sign in first.",
                ko: "먼저 로그인해 주세요.",
                zh: "请先登录。",
                ja: "先にログインしてください。",
              }[locale]}
            </h1>
            <p>
              {{
                en: "Only test administrator accounts can open this page.",
                ko: "테스트 관리자 계정만 이 화면을 열 수 있어요.",
                zh: "只有测试管理员账户可以打开此页面。",
                ja: "テスト管理者アカウントのみこの画面を開けます。",
              }[locale]}
            </p>
            <a className="login-button" href={authLinks.google}>
              {t.signIn}
            </a>
          </section>
        </main>
      )}
      {view === "privacy" && (
        <LegalPagePlan
          kind="privacy"
          locale={locale}
          onBack={() => navigate("home")}
        />
      )}
      {view === "terms" && (
        <LegalPagePlan
          kind="terms"
          locale={locale}
          onBack={() => navigate("home")}
        />
      )}
      {view === "setup" && (
        <main className="setup">
          <button className="back" onClick={() => navigate("home")}>
            {t.back}
          </button>
          <section className="setup-card">
            <p className="eyebrow">{t.newBoard}</p>
            <h1>
              {t.question.split("\n").map((x, i) => (
                <span key={x}>
                  {x}
                  {i === 0 && <br />}
                </span>
              ))}
            </h1>
            <label>
              <span>{t.name}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={24}
              />
            </label>
            <fieldset>
              <legend>{t.recordType}</legend>
              {(
                [
                  {
                    id: "level",
                    icon: "1–5",
                    name: t.levelName,
                    help: t.levelHelp,
                  },
                  {
                    id: "check",
                    icon: "✓ ×",
                    name: t.checkName,
                    help: t.checkHelp,
                  },
                  {
                    id: "mood",
                    icon: "☺",
                    name: t.moodName,
                    help: t.moodHelp,
                  },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  className={inputType === v.id ? "selected" : ""}
                  onClick={() => setInputType(v.id)}
                >
                  <b>{v.icon}</b>
                  <span>
                    <strong>{v.name}</strong>
                    <small>{v.help}</small>
                  </span>
                  <i>{inputType === v.id ? "●" : "○"}</i>
                </button>
              ))}
            </fieldset>
            <fieldset>
              <legend>{t.period}</legend>
              {[5, 10, 30, null, -1].map((v) => (
                <button
                  key={String(v)}
                  className={goal === v ? "selected" : ""}
                  onClick={() => setGoal(v)}
                >
                  <b>{v === null ? "∞" : v === -1 ? "✎" : v}</b>
                  <span>
                    <strong>
                      {v === null
                        ? t.endless
                        : v === -1
                          ? t.custom
                          : `${v} ${t.days}`}
                    </strong>
                    <small>
                      {v === null
                        ? t.moving
                        : v === -1
                          ? t.customHelp
                          : key(day(v - 1))}
                    </small>
                  </span>
                  <i>{goal === v ? "●" : "○"}</i>
                </button>
              ))}
            </fieldset>
            {goal === -1 && (
              <label>
                <span>{t.customDays}</span>
                <input
                  type="number"
                  min="3"
                  max="3650"
                  value={customGoal}
                  onChange={(e) =>
                    setCustomGoal(Math.max(3, Number(e.target.value)))
                  }
                />
              </label>
            )}
            <div className="actions">
              <button onClick={() => navigate("home")}>{t.cancel}</button>
              <button className="primary" onClick={add}>
                {t.make}
              </button>
            </div>
          </section>
        </main>
      )}
      {view === "detail" && board.id && (
        <Detail
          board={board}
          t={t}
          locale={locale}
          level={level}
          setLevel={setLevel}
          mood={mood}
          setMood={setMood}
          note={note}
          setNote={setNote}
          saved={saved}
          locked={!writable(board)}
          onUpgrade={upgrade}
          onSave={save}
          onFinish={finish}
          onDelete={removeBoard}
          backLabel={
            detailReturnView.current === "active-list"
              ? `← ${t.allActive}`
              : detailReturnView.current === "finished-list"
                ? `← ${t.allFinished}`
                : t.home
          }
          onBack={() => navigate(detailReturnView.current)}
        />
      )}
      <footer>
        <b>PixelLife</b>
        <span>Small days. Big life.</span>
        <nav>
          <a href="mailto:meet.wonderlife@gmail.com">{actionWords[locale].supportLabel}</a>
          <button onClick={() => navigate("privacy", true)}>{t.privacy}</button>
          <button onClick={() => navigate("terms", true)}>{t.terms}</button>
        </nav>
      </footer>
      {busy && <div className="busy-bar" aria-hidden="true" />}
    </div>
  );
}

function AccountPage({
  member,
  locale,
  onBack,
  onUpgrade,
  onPortal,
  onDelete,
}: {
  member: Member;
  locale: Locale;
  onBack: () => void;
  onUpgrade: () => void;
  onPortal: () => void;
  onDelete: () => void;
}) {
  const c = {
    en: {
      home: "← Home",
      account: "ACCOUNT",
      plan: "Current plan",
      active: "active boards",
      period: "Subscription period",
      canceling: "Ends after this paid period",
      support: "Email support",
      billing: "Manage billing",
      upgrade: "Start Plus",
      logout: "Log out",
      delete: "Leave PixelLife",
      deleteHelp: "Cancel Plus in billing first. After cancellation is scheduled, you can leave any time. Leaving deletes PixelLife data and access now; Polar keeps billing history for support.",
      deleteMe: "Leave PixelLife",
    },
    ko: {
      home: "← 홈",
      account: "계정",
      plan: "현재 요금제",
      active: "개 활성 보드",
      period: "구독 이용 기간",
      canceling: "현재 결제 기간 후 종료 예정",
      support: "이메일 문의",
      billing: "결제 관리",
      upgrade: "Plus 시작",
      logout: "로그아웃",
      delete: "회원 탈퇴",
      deleteHelp: "먼저 결제 관리에서 Plus를 해지해 주세요. 해지 예약 후에는 언제든 탈퇴할 수 있어요. 탈퇴하면 PixelLife 데이터와 이용은 즉시 끝나며 결제 이력은 문의를 위해 Polar에 남아요.",
      deleteMe: "회원 탈퇴하기",
    },
    zh: {
      home: "← 首页",
      account: "账户",
      plan: "当前方案",
      active: "个活动面板",
      period: "订阅期间",
      canceling: "将在当前付费期结束后停止",
      support: "邮件咨询",
      billing: "管理付款",
      upgrade: "开通Plus",
      logout: "退出登录",
      delete: "退出会员",
      deleteHelp:
        "请先在付款管理中取消Plus。预约取消后可随时退出。退出会立即删除PixelLife数据和使用权限，Polar会保留付款记录用于客服。",
      deleteMe: "退出会员",
    },
    ja: {
      home: "← ホーム",
      account: "アカウント",
      plan: "現在のプラン",
      active: "個の進行中ボード",
      period: "購読期間",
      canceling: "現在の支払期間後に終了予定",
      support: "メールで問い合わせ",
      billing: "支払いを管理",
      upgrade: "Plusを始める",
      logout: "ログアウト",
      delete: "退会",
      deleteHelp:
        "先に支払い管理でPlusを解約してください。解約予約後はいつでも退会できます。退会するとPixelLifeデータと利用は直ちに終了し、支払い履歴はサポートのためPolarに残ります。",
      deleteMe: "退会する",
    },
  }[locale];
  const paidFrom = member.paidFrom?.slice(0, 10);
  const paidUntil = member.paidUntil?.slice(0, 10);
  return (
    <main className="guide-page account-page">
      <button className="back" onClick={onBack}>
        {c.home}
      </button>
      <section>
        <p className="eyebrow">{c.account}</p>
        <h1>{c.account}</h1>
        <p>{member.email}</p>
        <div className="account-plan">
          <div>
            <span>{c.plan}</span>
            <b>{member.effectivePlan}</b>
          </div>
          <strong>{member.activeBoardLimit} {c.active}</strong>
          {(paidFrom || paidUntil) && <p>
            {c.period} · {paidFrom || "—"} ~ {paidUntil || "—"}
            {Boolean(member.cancelAtPeriodEnd) && <small>{c.canceling}</small>}
          </p>}
        </div>
        <div className="account-actions">
          <button className="primary" onClick={member.effectivePlan === "PLUS" ? onPortal : onUpgrade}>
            {member.effectivePlan === "PLUS" ? c.billing : c.upgrade}
          </button>
          <a href="mailto:meet.wonderlife@gmail.com">{c.support}</a>
          <a href={authLinks.logout}>{c.logout}</a>
        </div>
      </section>
      <section className="danger-zone">
        <h2>{c.delete}</h2>
        <p>{c.deleteHelp}</p>
        <button onClick={onDelete}>{c.deleteMe}</button>
      </section>
    </main>
  );
}
function LegalPagePlan({
  kind,
  locale,
  onBack,
}: {
  kind: "privacy" | "terms";
  locale: Locale;
  onBack: () => void;
}) {
  const base = {
    en: {
      home: "← Home",
      privacy: "Privacy",
      terms: "Terms",
      draft: "Draft · 2026-08-21",
      privacyText: [
        "PixelLife stores membership, board, record, reward, and subscription data needed to provide the service.",
        "Polar handles payment details. PixelLife does not store full card numbers.",
        "When you leave, PixelLife data is deleted. Polar keeps past billing records for support and legal duties. Contact meet.wonderlife@gmail.com with your receipt email or order ID.",
      ],
      termsText:
        "PixelLife is a personal tracking tool, not medical, financial, or professional advice.",
      policy:
        "Free and Guest allow up to 3 active boards. Plus allows up to 10. Signed-in members can keep earning rewards without a total limit. After Plus ends, existing active boards remain usable; new creation waits until fewer than 3 remain.",
    },
    ko: {
      home: "← 홈",
      privacy: "개인정보",
      terms: "이용약관",
      draft: "초안 · 2026년 8월 21일",
      privacyText: [
        "PixelLife는 서비스 제공에 필요한 회원, 보드, 기록, 보상과 구독 정보를 저장해요.",
        "결제 정보는 Polar가 처리하며 PixelLife는 전체 카드 번호를 저장하지 않아요.",
        "회원 탈퇴 시 PixelLife 데이터는 삭제하고 Polar의 과거 결제 기록은 문의와 법적 의무를 위해 유지해요. 영수증 이메일 또는 주문 ID와 함께 meet.wonderlife@gmail.com으로 문의할 수 있어요.",
      ],
      termsText:
        "PixelLife는 개인 기록 도구이며 의료·금융·전문적인 조언을 제공하지 않아요.",
      policy:
        "비회원과 무료는 활성 보드 최대 3개, Plus는 최대 10개예요. 로그인 회원은 완료 보상과 등급·배지를 제한 없이 누적해요. Plus 종료 후 기존 활성 보드는 모두 이용하며, 활성 보드가 3개 미만이 될 때까지 새 보드 생성만 제한해요.",
    },
    zh: {
      home: "← 首页",
      privacy: "隐私",
      terms: "条款",
      draft: "草案 · 2026年8月21日",
      privacyText: [
        "PixelLife会保存提供服务所需的会员、面板、记录、奖励和订阅信息。",
        "付款信息由Polar处理，PixelLife不保存完整卡号。",
        "退出后PixelLife数据会被删除，Polar会保留历史付款记录用于客服和法定义务。可将收据邮箱或订单ID发送至meet.wonderlife@gmail.com。",
      ],
      termsText: "PixelLife是个人记录工具，不构成医疗、金融或专业建议。",
      policy:
        "访客和免费最多3个活动面板，Plus最多10个。登录会员可无限累积奖励。Plus结束后现有面板仍可使用，少于3个前仅限制新建。",
    },
    ja: {
      home: "← ホーム",
      privacy: "プライバシー",
      terms: "利用規約",
      draft: "草案 · 2026年8月21日",
      privacyText: [
        "PixelLifeはサービス提供に必要な会員、ボード、記録、報酬、購読情報を保存します。",
        "支払い情報はPolarが処理し、PixelLifeは完全なカード番号を保存しません。",
        "退会時にPixelLifeデータは削除され、Polarの過去の支払い記録はサポートと法的義務のため保持されます。領収書メールまたは注文IDを添えてmeet.wonderlife@gmail.comへお問い合わせください。",
      ],
      termsText:
        "PixelLifeは個人記録ツールであり、医療・金融・専門的な助言ではありません。",
      policy:
        "ゲストと無料は進行中最大3個、Plusは最大10個です。ログイン会員の報酬累積に上限はありません。Plus終了後も既存ボードは使え、3個未満になるまで新規作成だけ制限します。",
    },
  }[locale];
  const title = base[kind];
  const paragraphs =
    kind === "privacy"
      ? base.privacyText
      : [base.termsText, base.policy];
  return (
    <main className="guide-page legal-page">
      <button className="back" onClick={onBack}>
        {base.home}
      </button>
      <article>
        <p className="eyebrow">PIXELLIFE</p>
        <h1>{title}</h1>
        <p className="legal-date">{base.draft}</p>
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>
    </main>
  );
}

function LegalPageSimple({
  kind,
  locale,
  onBack,
}: {
  kind: "privacy" | "terms";
  locale: Locale;
  onBack: () => void;
}) {
  const c = {
    en: {
      home: "← Home",
      draft: "Draft · August 21, 2026",
      privacy: [
        "Privacy",
        "PixelLife stores your Google account, boards, records, rewards, and subscription state to provide the service.",
        "Polar handles payment details. PixelLife does not store full card numbers.",
        "You can delete your account and PixelLife data from Account.",
      ],
      terms: [
        "Terms",
        "PixelLife is a personal tracking tool, not medical, financial, or professional advice.",
        "Guest, Free, and Plus use up to 3 active boards. Signed-in members can keep completing boards and earning rewards without a total limit.",
        "Plus supports PixelLife. Ending Plus does not remove data or lock existing active boards. If more than 3 exist, only new board creation is paused.",
      ],
    },
    ko: {
      home: "← 홈",
      draft: "초안 · 2026년 8월 21일",
      privacy: [
        "개인정보",
        "PixelLife는 서비스 제공을 위해 Google 계정, 보드, 기록, 보상과 구독 상태를 저장해요.",
        "결제 정보는 Polar가 처리하며 PixelLife는 전체 카드 번호를 저장하지 않아요.",
        "계정 화면에서 계정과 PixelLife 데이터를 삭제할 수 있어요.",
      ],
      terms: [
        "이용약관",
        "PixelLife는 개인 기록 도구이며 의료·금융·전문 조언이 아니에요.",
        "비회원·무료·Plus 모두 활성 보드는 최대 3개예요. 로그인 회원은 보드 완료와 보상을 총량 제한 없이 계속 누적할 수 있어요.",
        "Plus는 PixelLife 운영을 후원해요. Plus가 끝나도 데이터와 기존 활성 보드는 잠기지 않으며, 4개 이상이면 새 보드 생성만 잠시 멈춰요.",
      ],
    },
    zh: {
      home: "← 首页",
      draft: "草案 · 2026年8月21日",
      privacy: [
        "隐私",
        "PixelLife会保存Google账户、面板、记录、奖励和订阅状态以提供服务。",
        "付款信息由Polar处理，PixelLife不保存完整卡号。",
        "可在账户页面删除账户和PixelLife数据。",
      ],
      terms: [
        "条款",
        "PixelLife是个人记录工具，不构成医疗、金融或专业建议。",
        "访客、免费和Plus最多使用3个活动面板。登录会员可无限累积完成面板和奖励。",
        "Plus用于支持PixelLife。Plus结束不会删除数据或锁定现有面板；超过3个时仅暂停新建。",
      ],
    },
    ja: {
      home: "← ホーム",
      draft: "草案 · 2026年8月21日",
      privacy: [
        "プライバシー",
        "PixelLifeはサービス提供のためGoogleアカウント、ボード、記録、報酬、購読状態を保存します。",
        "支払い情報はPolarが処理し、完全なカード番号は保存しません。",
        "アカウント画面からアカウントとデータを削除できます。",
      ],
      terms: [
        "利用規約",
        "PixelLifeは個人記録ツールで、医療・金融・専門的助言ではありません。",
        "ゲスト・無料・Plusは進行中ボード最大3個です。ログイン会員は完了と報酬を制限なく積み重ねられます。",
        "PlusはPixelLifeを支援します。終了してもデータや既存ボードはロックされず、4個以上なら新規作成だけ停止します。",
      ],
    },
  }[locale];
  const [title, ...paragraphs] = c[kind];
  return (
    <main className="guide-page legal-page">
      <button className="back" onClick={onBack}>
        {c.home}
      </button>
      <article>
        <p className="eyebrow">PIXELLIFE</p>
        <h1>{title}</h1>
        <p className="legal-date">{c.draft}</p>
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>
    </main>
  );
}

function LegalPage({
  kind,
  locale,
  onBack,
}: {
  kind: "privacy" | "terms";
  locale: Locale;
  onBack: () => void;
}) {
  const copy = {
    en: {
      home: "← Home",
      draft: "Draft · August 20, 2026",
      privacy: [
        "Privacy",
        "PixelLife stores your Google account ID, email, display name, boards, daily records, rewards, and subscription state so the service can work.",
        "Payment details are handled by Polar. PixelLife does not store full card numbers.",
        "You can delete your account from Account. PixelLife data is removed, while billing event records may be retained when legally required.",
      ],
      terms: [
        "Terms",
        "PixelLife is a personal tracking tool. It is not medical, financial, or professional advice.",
        "Free allows one active board. Plus allows up to 30 while paid. Existing data stays after Plus ends.",
        "You may cancel Plus in the billing portal. Access continues until the paid period ends.",
      ],
    },
    ko: {
      home: "← 홈",
      draft: "초안 · 2026년 8월 20일",
      privacy: [
        "개인정보",
        "PixelLife는 서비스 제공을 위해 Google 계정 ID, 이메일, 표시 이름, 보드, 일별 기록, 보상과 구독 상태를 저장해요.",
        "결제 정보는 Polar가 처리하며 PixelLife는 전체 카드 번호를 저장하지 않아요.",
        "계정 화면에서 탈퇴할 수 있어요. PixelLife 데이터는 삭제되며 법적 의무가 있는 결제 이벤트 기록만 보관될 수 있어요.",
      ],
      terms: [
        "이용약관",
        "PixelLife는 개인 기록 도구이며 의료, 금융 또는 전문적인 조언이 아니에요.",
        "무료는 활성 보드 1개, Plus는 결제 기간 동안 최대 30개를 제공해요. Plus가 끝나도 기존 데이터는 유지돼요.",
        "결제 관리 화면에서 Plus를 해지할 수 있고 결제 기간 종료일까지 이용할 수 있어요.",
      ],
    },
    zh: {
      home: "← 首页",
      draft: "草案 · 2026年8月20日",
      privacy: [
        "隐私",
        "PixelLife为提供服务会保存Google账户ID、邮箱、显示名称、面板、每日记录、奖励和订阅状态。",
        "付款信息由Polar处理，PixelLife不保存完整卡号。",
        "你可以在账户页面删除账户。PixelLife数据会被删除，依法需要的付款事件记录可能会保留。",
      ],
      terms: [
        "条款",
        "PixelLife是个人记录工具，不构成医疗、金融或专业建议。",
        "免费版允许一个活动面板，Plus在付费期内允许最多30个。Plus结束后现有数据仍会保留。",
        "你可以在付款管理页面取消Plus，并使用到付费期结束。",
      ],
    },
    ja: {
      home: "← ホーム",
      draft: "草案 · 2026年8月20日",
      privacy: [
        "プライバシー",
        "PixelLifeはサービス提供のためGoogleアカウントID、メール、表示名、ボード、毎日の記録、報酬、購読状態を保存します。",
        "支払い情報はPolarが処理し、PixelLifeは完全なカード番号を保存しません。",
        "アカウント画面から削除できます。PixelLifeデータは削除され、法的に必要な決済イベント記録のみ保持される場合があります。",
      ],
      terms: [
        "利用規約",
        "PixelLifeは個人用記録ツールであり、医療、金融、専門的な助言ではありません。",
        "無料は進行中ボード1個、Plusは支払い期間中最大30個です。Plus終了後も既存データは保持されます。",
        "支払い管理画面からPlusを解約でき、支払い期間終了まで利用できます。",
      ],
    },
  }[locale];
  const [title, ...paragraphs] = copy[kind];
  return (
    <main className="guide-page legal-page">
      <button className="back" onClick={onBack}>
        {copy.home}
      </button>
      <article>
        <p className="eyebrow">PIXELLIFE</p>
        <h1>{title}</h1>
        <p className="legal-date">{copy.draft}</p>
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>
    </main>
  );
}

function GuidePage({
  locale,
  onBack,
  onStart,
  onRewards,
}: {
  locale: Locale;
  onBack: () => void;
  onStart: () => void;
  onRewards: () => void;
}) {
  const c = {
    en: {
      back: "← Home",
      eye: "HOW PIXELLIFE WORKS",
      title: (
        <>
          Small days become
          <br />a life you can see.
        </>
      ),
      intro:
        "PixelLife is a simple daily board. Add one small record, grow a clear pattern, and collect the plant you earned.",
      start: "Make my first board →",
      reward: "See plants and badges →",
      steps: [
        ["Make a board", "Write one small goal. Pick 1–5, Yes / No, or Mood."],
        ["Add today", "One tap makes one pixel. A short note is optional."],
        [
          "See your pattern",
          "Open Stats to see your rate and your record type chart.",
        ],
        ["Grow a plant", "Every board grows one plant from its own records."],
        [
          "Complete and collect",
          "A completed board becomes read-only. Its plant moves to the Conservatory.",
        ],
      ],
    },
    ko: {
      back: "← 홈",
      eye: "PIXELLIFE 이용 방법",
      title: (
        <>
          작은 하루가 모여
          <br />
          눈에 보이는 삶이 돼요.
        </>
      ),
      intro:
        "PixelLife는 간단한 하루 기록 보드예요. 작은 기록 하나로 패턴을 만들고 내가 키운 식물을 모아보세요.",
      start: "첫 보드 만들기 →",
      reward: "식물과 배지 보기 →",
      steps: [
        [
          "보드 만들기",
          "작은 목표 하나를 적고 1–5, 예/아니요, 기분 중 하나를 골라요.",
        ],
        [
          "오늘 기록하기",
          "한 번 누르면 픽셀 하나가 생겨요. 짧은 메모는 선택이에요.",
        ],
        ["패턴 보기", "통계에서 기록률과 기록 방식별 차트를 봐요."],
        ["식물 키우기", "보드 하나가 자신의 기록으로 식물 하나를 키워요."],
        [
          "완료하고 수집하기",
          "완료된 보드는 읽기 전용이 되고 식물은 식물원으로 이동해요.",
        ],
      ],
    },
    zh: {
      back: "← 首页",
      eye: "PIXELLIFE 使用方法",
      title: (
        <>
          小小的每一天
          <br />
          变成看得见的生活。
        </>
      ),
      intro:
        "PixelLife是简单的每日记录面板。添加一条小记录，形成清晰的规律，并收集你获得的植物。",
      start: "创建第一个面板 →",
      reward: "查看植物和徽章 →",
      steps: [
        ["创建面板", "写下一个小目标，选择1–5、是/否或心情。"],
        ["记录今天", "点一次生成一个像素，短笔记可选。"],
        ["查看规律", "在统计中查看记录率和类型图表。"],
        ["培育植物", "每个面板用自己的记录培育一株植物。"],
        ["完成并收集", "完成的面板变为只读，植物移入植物园。"],
      ],
    },
    ja: {
      back: "← ホーム",
      eye: "PIXELLIFE の使い方",
      title: (
        <>
          小さな毎日が
          <br />
          見える暮らしになります。
        </>
      ),
      intro:
        "PixelLifeはシンプルな毎日の記録ボードです。小さな記録を加え、パターンを見つけ、育てた植物を集めましょう。",
      start: "最初のボードを作る →",
      reward: "植物とバッジを見る →",
      steps: [
        [
          "ボードを作る",
          "小さな目標を書き、1〜5、はい/いいえ、気分から選びます。",
        ],
        [
          "今日を記録",
          "一回のタップでピクセルが一つできます。短いメモは任意です。",
        ],
        ["パターンを見る", "統計で記録率と種類別チャートを確認します。"],
        ["植物を育てる", "一つのボードが記録から一つの植物を育てます。"],
        [
          "完了して集める",
          "完了したボードは読み取り専用になり、植物は温室へ移ります。",
        ],
      ],
    },
  }[locale];
  return (
    <main className="guide-page">
      <button className="back" onClick={onBack}>
        {c.back}
      </button>
      <section className="guide-hero">
        <p className="eyebrow">{c.eye}</p>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
        <button onClick={onStart}>{c.start}</button>
      </section>
      <section className="guide-steps">
        {c.steps.map(([title, copy], i) => (
          <article key={title}>
            <span>{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="guide-types">
        <div>
          <b>1–5</b>
          <h3>{extraWords[locale].levelName}</h3>
          <p>{extraWords[locale].levelHelp}</p>
        </div>
        <div>
          <b>✓</b>
          <h3>{extraWords[locale].checkName}</h3>
          <p>{extraWords[locale].checkHelp}</p>
        </div>
        <div>
          <b>☺</b>
          <h3>{extraWords[locale].moodName}</h3>
          <p>{extraWords[locale].moodHelp}</p>
        </div>
      </section>
      <button className="rewards-link" onClick={onRewards}>
        {c.reward}
      </button>
    </main>
  );
}

function RewardsPage({
  onBack,
  rewards,
  locale,
}: {
  onBack: () => void;
  rewards: RewardData | null;
  locale: Locale;
}) {
  const badgeCopy: Record<Locale, Record<string, [string, string]>> = {
    en: {
      VISITOR: ["Visitor", "Visit on 7 different days."], PIXEL: ["Pixel", "Save 30 daily records."], GARDENER: ["Gardener", "Complete 3 plants."], COLLECTOR: ["Collector", "Collect 4 different plant species."], PERFECT: ["Perfect", "Finish one board at 100%."], NOTEBOOK: ["Notebook", "Save 20 records with a note."], STEADY_WEEK: ["Steady Week", "Record 7 days in a row."], THREE_WAYS: ["Three Ways", "Complete all 3 board types."], LONG_JOURNEY: ["Long Journey", "Complete a board of 90 days or more."], HUNDRED_PIXELS: ["Hundred Pixels", "Save 100 daily records."], FULL_GARDEN: ["Full Garden", "Complete 10 plants."],
    },
    ko: {
      VISITOR: ["방문자", "서로 다른 날짜에 7일 방문하세요."], PIXEL: ["픽셀", "하루 기록을 30개 저장하세요."], GARDENER: ["정원사", "식물 3개를 완성하세요."], COLLECTOR: ["수집가", "서로 다른 식물 4종을 모으세요."], PERFECT: ["완벽", "완료율 100% 보드 1개를 완성하세요."], NOTEBOOK: ["기록가", "메모가 있는 기록을 20개 저장하세요."], STEADY_WEEK: ["꾸준한 한 주", "7일 연속 기록하세요."], THREE_WAYS: ["세 가지 방식", "3가지 보드 종류를 모두 완료하세요."], LONG_JOURNEY: ["긴 여정", "90일 이상 보드를 완료하세요."], HUNDRED_PIXELS: ["백 개의 픽셀", "하루 기록을 100개 저장하세요."], FULL_GARDEN: ["가득 찬 정원", "식물 10개를 완성하세요."],
    },
    zh: {
      VISITOR: ["访客", "在7个不同日期访问。"], PIXEL: ["像素", "保存30条每日记录。"], GARDENER: ["园丁", "完成3株植物。"], COLLECTOR: ["收藏家", "收集4种不同植物。"], PERFECT: ["完美", "完成一个达成率100%的面板。"], NOTEBOOK: ["记录者", "保存20条带笔记的记录。"], STEADY_WEEK: ["稳定一周", "连续记录7天。"], THREE_WAYS: ["三种方式", "完成全部3种面板。"], LONG_JOURNEY: ["漫长旅程", "完成一个90天以上的面板。"], HUNDRED_PIXELS: ["百个像素", "保存100条每日记录。"], FULL_GARDEN: ["满园", "完成10株植物。"],
    },
    ja: {
      VISITOR: ["訪問者", "異なる日に7日訪問します。"], PIXEL: ["ピクセル", "毎日の記録を30件保存します。"], GARDENER: ["庭師", "植物を3個完成します。"], COLLECTOR: ["収集家", "異なる植物を4種類集めます。"], PERFECT: ["パーフェクト", "達成率100%のボードを1個完了します。"], NOTEBOOK: ["記録家", "メモ付き記録を20件保存します。"], STEADY_WEEK: ["安定した一週間", "7日連続で記録します。"], THREE_WAYS: ["三つの方法", "3種類のボードをすべて完了します。"], LONG_JOURNEY: ["長い旅", "90日以上のボードを完了します。"], HUNDRED_PIXELS: ["百個のピクセル", "毎日の記録を100件保存します。"], FULL_GARDEN: ["満開の庭", "植物を10個完成します。"],
    },
  };
  const colorHex: Record<string, string> = { SKY: "#4F8FD8", ORANGE: "#D6763E", VIOLET: "#8967C7", ROSE: "#C85F7A", GOLD: "#D3A62B", MINT: "#54BFA3", TEAL: "#2F8C83", INDIGO: "#5666A5", CORAL: "#D96F62", RUBY: "#B94C5B", SLATE: "#62707D" };
  const colorNames: Record<Locale, Record<string, string>> = {
    en: { SKY: "Sky", ORANGE: "Orange", VIOLET: "Violet", ROSE: "Rose", GOLD: "Gold", MINT: "Mint", TEAL: "Teal", INDIGO: "Indigo", CORAL: "Coral", RUBY: "Ruby", SLATE: "Slate" },
    ko: { SKY: "하늘색", ORANGE: "주황색", VIOLET: "보라색", ROSE: "장미색", GOLD: "금색", MINT: "민트색", TEAL: "청록색", INDIGO: "남색", CORAL: "코랄색", RUBY: "루비색", SLATE: "회청색" },
    zh: { SKY: "天蓝", ORANGE: "橙色", VIOLET: "紫色", ROSE: "玫瑰色", GOLD: "金色", MINT: "薄荷色", TEAL: "蓝绿色", INDIGO: "靛蓝", CORAL: "珊瑚色", RUBY: "宝石红", SLATE: "石板灰" },
    ja: { SKY: "空色", ORANGE: "オレンジ", VIOLET: "紫", ROSE: "ローズ", GOLD: "ゴールド", MINT: "ミント", TEAL: "青緑", INDIGO: "藍色", CORAL: "コーラル", RUBY: "ルビー", SLATE: "スレート" },
  };
  const gradeNames: Record<Locale, Record<string, string>> = {
    en: { SEED: "Seed", SPROUT: "Sprout", GROVE: "Grove", GARDENER: "Gardener", BOTANIST: "Botanist", CONSERVATOR: "Conservator" },
    ko: { SEED: "씨앗", SPROUT: "새싹", GROVE: "숲", GARDENER: "정원사", BOTANIST: "식물학자", CONSERVATOR: "보존가" },
    zh: { SEED: "种子", SPROUT: "新芽", GROVE: "树林", GARDENER: "园丁", BOTANIST: "植物学家", CONSERVATOR: "守护者" },
    ja: { SEED: "種", SPROUT: "芽", GROVE: "木立", GARDENER: "庭師", BOTANIST: "植物学者", CONSERVATOR: "保全者" },
  };
  const speciesNames: Record<Locale, Record<string, string>> = {
    en: { OAK: "Oak", CACTUS: "Cactus", TULIP: "Tulip", PINE: "Pine", FERN: "Fern", SUNFLOWER: "Sunflower", MAPLE: "Maple", LOTUS: "Lotus", BAMBOO: "Bamboo", CHERRY: "Cherry", PALM: "Palm", CRYSTAL: "Crystal Plant" },
    ko: { OAK: "참나무", CACTUS: "선인장", TULIP: "튤립", PINE: "소나무", FERN: "고사리", SUNFLOWER: "해바라기", MAPLE: "단풍나무", LOTUS: "연꽃", BAMBOO: "대나무", CHERRY: "벚나무", PALM: "야자나무", CRYSTAL: "수정 식물" },
    zh: { OAK: "橡树", CACTUS: "仙人掌", TULIP: "郁金香", PINE: "松树", FERN: "蕨类", SUNFLOWER: "向日葵", MAPLE: "枫树", LOTUS: "莲花", BAMBOO: "竹子", CHERRY: "樱花树", PALM: "棕榈树", CRYSTAL: "水晶植物" },
    ja: { OAK: "オーク", CACTUS: "サボテン", TULIP: "チューリップ", PINE: "松", FERN: "シダ", SUNFLOWER: "ひまわり", MAPLE: "カエデ", LOTUS: "蓮", BAMBOO: "竹", CHERRY: "桜", PALM: "ヤシ", CRYSTAL: "クリスタル植物" },
  };
  const c = {
    en: {
      home: "← Home",
      loading: "Loading rewards…",
      title: "Complete boards. Grow your reward pool.",
      help: "Each recorded day becomes 1 XP when you finish. Grades unlock plant species. Badges unlock plant colors.",
      pool: "plants in the random pool",
      draw: "Your current draw",
      badges: "COLOR BADGES",
      of: "of",
      earned: "earned",
      badgeHelp: "Each badge adds one plant color to future board rewards.",
      progress: "Progress",
      goal: "Goal",
      done: "Earned",
      notStarted: "Not started",
      empty: "Your reward guide will appear after the account data loads.",
    },
    ko: {
      home: "← 홈",
      loading: "보상을 불러오는 중…",
      title: "보드를 완료하고 보상 풀을 키워요.",
      help: "보드를 완료하면 기록한 하루마다 1 XP를 받아요. 등급은 식물 종류를, 배지는 식물 색상을 해금해요.",
      pool: "종이 랜덤 보상 풀에 포함",
      draw: "현재 랜덤 보상",
      badges: "컬러 배지",
      of: "개 중",
      earned: "획득",
      badgeHelp: "배지 하나마다 앞으로 받을 수 있는 식물 색상이 하나 늘어요.",
      progress: "진행",
      goal: "목표",
      done: "달성",
      notStarted: "시작 전",
      empty: "계정 데이터를 불러오면 보상 안내가 표시돼요.",
    },
    zh: {
      home: "← 首页",
      loading: "正在加载奖励…",
      title: "完成面板，扩大你的奖励池。",
      help: "完成面板时，每个记录日获得1 XP。等级解锁植物种类，徽章解锁植物颜色。",
      pool: "种植物进入随机奖励池",
      draw: "当前随机奖励",
      badges: "颜色徽章",
      of: "个中",
      earned: "已获得",
      badgeHelp: "每个徽章都会为未来奖励增加一种植物颜色。",
      progress: "进度",
      goal: "目标",
      done: "已获得",
      notStarted: "未开始",
      empty: "账户数据加载后会显示奖励说明。",
    },
    ja: {
      home: "← ホーム",
      loading: "報酬を読み込み中…",
      title: "ボードを完了して報酬プールを育てよう。",
      help: "ボード完了時、記録した1日につき1 XPを獲得します。等級は植物の種類、バッジは植物の色を解放します。",
      pool: "種類がランダム報酬プールに含まれます",
      draw: "現在の抽選内容",
      badges: "カラーバッジ",
      of: "個中",
      earned: "獲得",
      badgeHelp: "バッジ一つごとに今後の植物カラーが一つ増えます。",
      progress: "進捗",
      goal: "目標",
      done: "獲得済み",
      notStarted: "未開始",
      empty: "アカウントデータの読み込み後に報酬ガイドが表示されます。",
    },
  }[locale];
  if (!rewards)
    return (
      <main className="guide-page rewards-page">
        <button className="back" onClick={onBack}>
          {c.home}
        </button>
        <section className="reward-empty">
          <p>{c.loading}</p>
          <small>{c.empty}</small>
        </section>
      </main>
    );
  return (
    <main className="guide-page rewards-page">
      <button className="back" onClick={onBack}>
        {c.home}
      </button>
      <section className="guide-hero reward-hero">
        <p className="eyebrow">
          {gradeNames[locale][rewards.gradeCode] || titleCase(rewards.gradeCode)} · {rewards.totalXp} XP
        </p>
        <h1>{c.title}</h1>
        <p>{c.help}</p>
      </section>
      <section className="grade-catalog">
        {rewards.gradeGuide.map((item) => (
          <article
            className={item.code === rewards.gradeCode ? "current" : ""}
            key={item.code}
          >
            <span>{item.species}</span>
            <h2>{gradeNames[locale][item.code] || titleCase(item.code)}</h2>
            <b>{item.xp.toLocaleString()} XP</b>
            <p>
              {item.species} {c.pool}
            </p>
          </article>
        ))}
      </section>
      <section className="rare-rule">
        <span>✦</span>
        <div>
          <h2>{c.draw}</h2>
          <div className="reward-species-list">
            {rewards.speciesPool.map((item) => (
              <span key={item.code}>
                <i aria-hidden="true">{item.symbol}</i>
                {speciesNames[locale][item.code] || item.name}
              </span>
            ))}
          </div>
          <div className="reward-colors">
            {rewards.unlockedColors.map((color) => (
              <i
                key={color.code}
                title={colorNames[locale][color.code] || titleCase(color.code)}
                style={{ background: color.cssColor }}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="badge-guide">
        <div>
          <p className="eyebrow">{c.badges}</p>
          <h2>
            {rewards.badges.filter((b) => Boolean(b.earned)).length} /{" "}
            {rewards.badges.length} {c.earned}
          </h2>
          <p>{c.badgeHelp}</p>
        </div>
        <div className="badge-grid">
          {rewards.badges.map((badge) => {
            const copy = badgeCopy[locale][badge.code] || [badge.name, badge.description];
            const colorName = colorNames[locale][badge.unlockColor] || titleCase(badge.unlockColor);
            const current = Math.min(badge.currentValue, badge.targetValue);
            return <article
              className={badge.earned ? "earned" : "locked"}
              key={badge.code}
            >
              <i className="badge-color-dot" style={{ background: colorHex[badge.unlockColor] || "#D8CFAF" }} title={colorName} />
              <div>
                <h3>{copy[0]}</h3>
                <p>{copy[1]}</p>
              </div>
              <span>
                {badge.earned ? c.done : current === 0 ? c.notStarted : c.progress} · {current}/{badge.targetValue} · {colorName}
              </span>
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}

function BoardCard({
  board,
  t,
  onOpen,
  locked = false,
}: {
  board: Board;
  t: any;
  onOpen: () => void;
  locked?: boolean;
}) {
  const days = diff(board.startDate, today) + 1,
    wins = board.entries.length;
  const recent = Array.from({ length: 10 }, (_, i) =>
    board.entries.find((e) => e.date === key(day(i - 9))),
  );
  return (
    <button
      className={`board-card compact ${locked ? "locked" : ""}`}
      onClick={onOpen}
      style={{ "--board-color": board.color } as React.CSSProperties}
    >
      <div className="card-top">
        <span className="type-icon">
          {board.inputType === "level"
            ? "1–5"
            : board.inputType === "check"
              ? "✓ ×"
              : "☺"}
        </span>
        <span>{locked ? t.readOnly : "↗"}</span>
      </div>
      <div className="card-copy">
        <h3>{board.title}</h3>
        <small className="card-day">
          {t.day} {days}
        </small>
        <p>
          {wins} {t.wins} · {Math.round((wins / days) * 100)}%
        </p>
        <small className="board-dates">
          <span>
            {t.period}: {board.goalDays === null ? "∞" : `${board.goalDays} ${t.days}`}
          </span>
          <span>
            {board.startDate} ~ {endDate(board) || "∞"}
          </span>
        </small>
      </div>
      <div className="card-pixels">
        {recent.map((e, i) => (
          <i
            key={i}
            className={
              e
                ? `done level-${board.inputType === "level" ? e.value : board.inputType === "check" ? (e.value ? 5 : 0) : 5}`
                : ""
            }
          >
            {board.inputType === "mood"
              ? e?.emoji
              : board.inputType === "check" && e
                ? e.value
                  ? "✓"
                  : "×"
                : ""}
          </i>
        ))}
      </div>
    </button>
  );
}

function Plant({
  board,
  t,
  complete = false,
}: {
  board: Board;
  t: any;
  complete?: boolean;
}) {
  const wins = board.entries.length;
  const stage =
    wins >= 90 ? 5 : wins >= 30 ? 4 : wins >= 7 ? 3 : wins >= 3 ? 2 : 1;
  const species =
    board.rewardSpeciesName ||
    (board.inputType === "level"
      ? t.levelName
      : board.inputType === "check"
        ? t.checkName
        : t.moodName);
  const mark =
    board.rewardSpeciesSymbol ||
    (board.inputType === "level"
      ? "♣"
      : board.inputType === "check"
        ? "♜"
        : "✿");
  return (
    <div
      className={`plant stage-${stage} species-${board.inputType} ${complete ? "complete" : ""}`}
      style={{ "--plant": board.color } as React.CSSProperties}
    >
      <div className="plant-art">
        <i />
        <b>{stage === 1 ? "·" : mark}</b>
        {complete && <em>✓</em>}
      </div>
      <span className="species">{species}</span>
      <strong>{board.title}</strong>
      <small>
        {wins} {t.records} ·{" "}
        {complete ? `${t.completed} ${endDate(board)}` : `${t.stage} ${stage}`}
      </small>
    </div>
  );
}
function CollectedPlant({ plant, t }: { plant: RewardPlant; t: any }) {
  return (
    <div
      className="plant complete"
      style={{ "--plant": plant.cssColor } as React.CSSProperties}
    >
      <div className="plant-art">
        <i />
        <b>{plant.symbol}</b>
        <em>✓</em>
      </div>
      <span className="species">{plant.speciesName}</span>
      <strong>{plant.boardName}</strong>
      <small>
        {plant.xpAwarded} XP · {plant.earnedAt?.slice(0, 10)}
      </small>
    </div>
  );
}
function Garden({
  boards,
  plants,
  t,
  onGrowing,
  onComplete,
}: {
  boards: Board[];
  plants: RewardPlant[];
  t: any;
  onGrowing: () => void;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<"list" | "map">("map");
  const [zoom, setZoom] = useState(0.8);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const previewPlants = plants.slice(0, 4);
  return (
    <section className="garden">
      <div className="garden-head">
        <div>
          <p className="eyebrow">{t.pixelGarden}</p>
          <h2>{t.gardenTitle}</h2>
          <p>{t.gardenHelp}</p>
        </div>
        <button onClick={onGrowing}>
          {t.allGrowing} ({boards.length}) →
        </button>
      </div>
      <div className="garden-plants">
        {boards.slice(0, 4).map((board) => (
          <Plant key={board.id} board={board} t={t} />
        ))}
      </div>
      <div className="conservatory">
        <div className="garden-head">
          <div>
            <p className="eyebrow">{t.conservatory}</p>
            <h2>{t.completedPlants}</h2>
            <p>{t.completedPlantsHelp}</p>
          </div>
          <button onClick={onComplete}>{t.openCollection} →</button>
        </div>
        <div className="garden-tabs">
          <button
            className={mode === "list" ? "active" : ""}
            onClick={() => setMode("list")}
          >
            {t.list}
          </button>
          <button
            className={mode === "map" ? "active" : ""}
            onClick={() => setMode("map")}
          >
            {t.map}
          </button>
          <span>
            {plants.length} {t.plants}
          </span>
        </div>
        {plants.length === 0 ? (
          <p className="empty-garden">{t.emptyPlants}</p>
        ) : mode === "list" ? (
          <div className="conservatory-list">
            {previewPlants.map((plant) => (
              <CollectedPlant key={plant.id} plant={plant} t={t} />
            ))}
          </div>
        ) : (
          <div className="garden-map-shell">
            <div
              className="garden-map"
              onPointerDown={(e) => {
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  px: pos.x,
                  py: pos.y,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  setPos({
                    x: drag.current.px + e.clientX - drag.current.x,
                    y: drag.current.py + e.clientY - drag.current.y,
                  });
              }}
            >
              <div
                className="garden-map-world"
                style={{
                  transform: `translate(${pos.x}px,${pos.y}px) scale(${zoom})`,
                }}
              >
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    style={
                      {
                        "--plant": plant.cssColor,
                        left: `${38 + plant.mapX * 92}px`,
                        top: `${35 + plant.mapY * 92}px`,
                      } as React.CSSProperties
                    }
                    title={`${plant.boardName} · ${plant.xpAwarded} XP`}
                  >
                    <b>{plant.symbol}</b>
                    <small>{plant.boardName}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="map-controls">
              <button onClick={() => setZoom((v) => Math.max(0.45, v - 0.15))}>
                −
              </button>
              <button
                onClick={() => {
                  setZoom(0.8);
                  setPos({ x: 0, y: 0 });
                }}
              >
                {t.fit}
              </button>
              <button onClick={() => setZoom((v) => Math.min(1.6, v + 0.15))}>
                ＋
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Detail({
  board,
  t,
  locale,
  level,
  setLevel,
  mood,
  setMood,
  note,
  setNote,
  saved,
  locked,
  onUpgrade,
  onSave,
  onFinish,
  onDelete,
  backLabel,
  onBack,
}: {
  board: Board;
  t: any;
  locale: Locale;
  level: number;
  setLevel: (n: number) => void;
  mood: string;
  setMood: (s: string) => void;
  note: string;
  setNote: (s: string) => void;
  saved: boolean;
  locked: boolean;
  onUpgrade: () => void;
  onSave: () => void;
  onFinish: () => void;
  onDelete: () => void;
  backLabel: string;
  onBack: () => void;
}) {
  t.inputType = board.inputType;
  t.board = board;
  t.mood = mood;
  t.setMood = setMood;
  t.locale = locale;
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"board" | "stats">("board");
  const [loading, setLoading] = useState(false);
  const [inspect, setInspect] = useState<Entry | undefined>(
    board.entries.filter((e) => e.note).at(-1),
  );
  const swipeStart = useRef(0);
  const swipeGuard = useRef({ x: 0, y: 0, id: -1 });
  useEffect(() => {
    setPage(0);
    setTab("board");
    setInspect(board.entries.filter((entry) => entry.note).at(-1));
  }, [board.id]);
  const boardEnd = endDate(board);
  const periodExpired =
    !isFinished(board) && boardEnd !== null && today > boardEnd;
  const anchor = boardEnd && (isFinished(board) || periodExpired) ? boardEnd : today;
  const days = diff(board.startDate, anchor) + 1,
    wins = board.entries.length,
    avg = wins ? board.entries.reduce((a, e) => a + e.value, 0) / wins : 0;
  const anchorWeekEnd = new Date(`${anchor}T12:00:00`);
  anchorWeekEnd.setDate(anchorWeekEnd.getDate() + (6 - anchorWeekEnd.getDay()));
  const maxPage = Math.floor(
    Math.max(0, diff(board.startDate, key(anchorWeekEnd))) / BOARD_PAGE_DAYS,
  );
  const changePage = (direction: number) => {
    const next = Math.min(maxPage, Math.max(0, page + direction));
    if (next === page) return;
    setLoading(true);
    setTimeout(() => {
      setPage(next);
      setLoading(false);
    }, 220);
  };
  const calendar = useMemo(() => {
    const last = new Date(anchorWeekEnd);
    last.setDate(last.getDate() - page * BOARD_PAGE_DAYS);
    const first = new Date(last);
    first.setDate(last.getDate() - (BOARD_PAGE_DAYS - 1));
    const boardStart = new Date(`${board.startDate}T12:00:00`);
    const visibleFirst = first < boardStart ? boardStart : first;
    const count =
      Math.floor((last.getTime() - visibleFirst.getTime()) / 86400000) + 1;
    return Array.from({ length: Math.max(1, count) }, (_, i) => {
      const d = new Date(visibleFirst);
      d.setDate(visibleFirst.getDate() + i);
      const k = key(d),
        entry = board.entries.find((e) => e.date === k);
      return {
        k,
        num:
          board.inputType === "mood" && entry?.emoji
            ? entry.emoji
            : d.getDate(),
        entry,
        weekDay: d.getDay(),
        available:
          k >= board.startDate &&
          k <= anchor &&
          (boardEnd === null || k <= boardEnd),
      };
    });
  }, [board, page, anchor]);
  const streakStartOffset = board.entries.some((e) => e.date === today) ? 0 : 1;
  let currentStreak = 0;
  while (
    board.entries.some(
      (e) => e.date === key(day(-(streakStartOffset + currentStreak))),
    )
  )
    currentStreak++;
  const streakDates = new Set(
    Array.from({ length: currentStreak }, (_, i) =>
      key(day(-(streakStartOffset + i))),
    ),
  );
  const milestones = [3, 7, 10, 30];
  const next = milestones.find((n) => currentStreak < n);
  const streakTier = [30, 10, 7, 3].find((n) => currentStreak >= n);
  const weeks = Array.from(
    { length: 13 },
    (_, w) =>
      Array.from({ length: 7 }, (_, d) =>
        board.entries.some(
          (e) => e.date === key(day(-((12 - w) * 7 + (6 - d)))),
        ),
      ).filter(Boolean).length,
  );
  const best = Math.max(...weeks);
  const dateLocale = { en: "en-US", ko: "ko-KR", zh: "zh-CN", ja: "ja-JP" }[
    locale
  ];
  useEffect(() => {
    document.body.dataset.boardType = board.inputType;
    return () => {
      delete document.body.dataset.boardType;
    };
  }, [board.inputType]);
  const finishPoint = new Date(`${board.startDate}T12:00:00`);
  finishPoint.setDate(
    finishPoint.getDate() +
      (board.goalDays === null
        ? 6
        : Math.max(0, Math.ceil(board.goalDays / 2) - 1)),
  );
  const finishDate = key(finishPoint);
  const finishReady = today >= finishDate;
  const scoreGoal = board.goalDays || Math.max(1, days);
  const expectedXp = Math.min(wins, scoreGoal);
  useEffect(() => {
    if (tab !== "board") return;
    const side = document.querySelector<HTMLElement>(".detail .side");
    const finishPanel = document.querySelector<HTMLElement>(
      ".detail .finish-panel",
    );
    if (finishPanel) {
      finishPanel.dataset.xp = `${expectedXp} XP`;
      finishPanel.dataset.xpLabel = {
        en: "Expected XP",
        ko: "예상 획득 XP",
        zh: "预计获得 XP",
        ja: "獲得予定 XP",
      }[locale];
    }
    if (side) {
      side.classList.toggle("finished-reward", isFinished(board));
      side.dataset.xp = `${board.xpAwarded || 0} XP`;
      side.dataset.xpLabel = {
        en: "XP earned",
        ko: "획득한 XP",
        zh: "已获得 XP",
        ja: "獲得した XP",
      }[locale];
    }
  }, [tab, board.id, board.status, board.xpAwarded, expectedXp, locale]);
  useEffect(() => {
    if (tab !== "board") return;
    const card = document.querySelector<HTMLElement>(".detail .calendar-card");
    if (!card) return;
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest("button, input, textarea, select, a")) {
        swipeGuard.current.id = -1;
        return;
      }
      swipeGuard.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      card.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const g = swipeGuard.current;
      if (g.id !== e.pointerId) return;
      const dx = Math.abs(e.clientX - g.x),
        dy = Math.abs(e.clientY - g.y);
      if (dx > 8 && dx > dy) e.preventDefault();
    };
    const end = (e: PointerEvent) => {
      if (swipeGuard.current.id === e.pointerId) swipeGuard.current.id = -1;
    };
    card.addEventListener("pointerdown", down);
    card.addEventListener("pointermove", move, { passive: false });
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
    return () => {
      card.removeEventListener("pointerdown", down);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", end);
      card.removeEventListener("pointercancel", end);
    };
  }, [tab, board.id, page]);
  return (
    <main
      className="detail"
      style={{ "--board-color": board.color } as React.CSSProperties}
    >
      <button className="back" onClick={onBack}>
        {backLabel}
      </button>
      <nav className="detail-tabs">
        <button
          className={tab === "board" ? "active" : ""}
          onClick={() => setTab("board")}
        >
          {t.boardTab}
        </button>
        <button
          className={tab === "stats" ? "active" : ""}
          onClick={() => setTab("stats")}
        >
          {t.stats}
        </button>
      </nav>
      {tab === "board" ? (
        <div className="detail-grid">
          <section
            className={`calendar-card ${loading ? "loading" : ""}`}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("button, input, textarea, select, a"))
                return;
              swipeStart.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if ((e.target as Element).closest("button, input, textarea, select, a"))
                return;
              const delta = e.clientX - swipeStart.current;
              if (Math.abs(delta) > 45) changePage(delta > 0 ? -1 : 1);
            }}
          >
            <div className="detail-head">
              <div>
                <p className="eyebrow">
                  {t.day} {days} · {isFinished(board)
                    ? t.completed
                    : periodExpired
                      ? t.periodEnded
                      : t.rolling}
                </p>
                <h1>{board.title}</h1>
                <p className="detail-summary">
                  <span>
                    {wins} {t.wins}
                  </span>
                  <span>
                    {t.period}: {board.goalDays === null ? "∞" : `${board.goalDays} ${t.days}`} · {board.startDate} ~ {endDate(board) || "∞"}
                  </span>
                </p>
                <p>{wins === 0 ? t.first : wins === 1 ? t.again : t.moving}</p>
              </div>
              <span className="range">
                {calendar[0].k}
                <br />~ {calendar.at(-1)?.k}
              </span>
            </div>
            {page < maxPage && (
              <button className="load-edge" onClick={() => changePage(1)}>
                ← {t.older}
              </button>
            )}
            <div className="weekdays">
              {Array.from({ length: 7 }, (_, i) =>
                new Intl.DateTimeFormat(dateLocale, {
                  weekday: "short",
                }).format(new Date(2026, 7, 16 + i)),
              ).map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendar.map((c, index) => {
                const streakClass =
                  c.entry && streakDates.has(c.k) && streakTier
                    ? `streak s${streakTier}`
                    : "";
                return (
                  <button
                    key={c.k}
                    disabled={!c.available}
                    style={index === 0 ? { gridColumnStart: c.weekDay + 1 } : undefined}
                    onClick={() => setInspect(c.entry)}
                    className={`${c.entry ? `done level-${c.entry.value}` : ""} ${!isFinished(board) && c.available && c.k === today ? "today" : ""} ${c.entry?.note ? "has-note" : ""} ${streakClass}`}
                    title={c.k}
                  >
                    <small>{c.num}</small>
                    {c.entry?.note && <i className="note-dot" />}
                  </button>
                );
              })}
            </div>
            {page > 0 && (
              <button
                className="load-edge bottom"
                onClick={() => changePage(-1)}
              >
                {t.newer} →
              </button>
            )}
            <p className="scroll-tip">
              ↔ {t.scroll} · {t.local}
            </p>
            <div className="calendar-key">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n}>
                  <i className={`level-${n}`} />
                  {n}
                </span>
              ))}
            </div>
            {inspect && (
              <div className="shown-note">
                <span>✎</span>
                <div>
                  <b>
                    {t.noteTitle}{" "}
                    {new Intl.DateTimeFormat(dateLocale, {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(`${inspect.date}T12:00:00`))}
                  </b>
                  <p>{inspect.note || t.noNote}</p>
                </div>
              </div>
            )}
          </section>
          <aside className="side">
            {locked ? (
              <section className="readonly-card">
                <p className="eyebrow">{t.readOnly}</p>
                <h2>{t.recordsSafe}</h2>
                <p>{t.freeReadOnly}</p>
                <button onClick={onUpgrade}>{t.startPlus}</button>
              </section>
            ) : periodExpired ? (
              <section className="readonly-card period-ended-card">
                <p className="eyebrow">{t.periodEnded}</p>
                <h2>{t.periodEndedTitle}</h2>
                <p>{t.periodEndedHelp}</p>
              </section>
            ) : (
              <Today
                t={t}
                level={level}
                setLevel={setLevel}
                note={note}
                setNote={setNote}
                saved={saved}
                onSave={onSave}
              />
            )}{" "}
            {!isFinished(board) && !locked && (
              <section className={`finish-panel ${finishReady ? "ready" : ""}`}>
                <div>
                  <b>
                    {finishReady
                      ? t.completeBoard
                      : `${t.finishLocked} · ${finishDate}`}
                  </b>
                  <p>{t.finishRule}</p>
                </div>
                <button disabled={!finishReady} onClick={onFinish}>
                  {t.completeBoard}
                </button>
              </section>
            )}
            {!isFinished(board) && !locked && (
              <section className="delete-board-panel">
                <p>{t.deleteHelp}</p>
                <button onClick={onDelete}>{t.deleteBoard}</button>
              </section>
            )}
            <section className="milestone-box">
              <p className="eyebrow">
                {t.milestones} · {currentStreak}
              </p>
              <div>
                {milestones.map((n) => (
                  <span
                    className={currentStreak >= n ? `hit m${n}` : ""}
                    key={n}
                  >
                    <b>{n}</b>
                    <small>{currentStreak >= n ? t.reached : t.next}</small>
                  </span>
                ))}
              </div>
              {next && (
                <p>
                  {next - currentStreak} {t.next}
                </p>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <Stats
          t={t}
          wins={wins}
          days={days}
          avg={avg}
          best={best}
          weeks={weeks}
        />
      )}
    </main>
  );
}

function Today({
  t,
  level,
  setLevel,
  note,
  setNote,
  saved,
  onSave,
}: {
  t: any;
  level: number;
  setLevel: (n: number) => void;
  note: string;
  setNote: (s: string) => void;
  saved: boolean;
  onSave: (success?: boolean) => void;
}) {
  if (isFinished(t.board)) return null;
  return (
    <section className="today-card">
      <p className="eyebrow">{t.today}</p>
      <h2>
        {t.inputType === "check"
          ? t.didIt
          : t.inputType === "mood"
            ? t.feel
            : t.how}
      </h2>
      <p>
        {t.inputType === "check"
          ? t.oneTap
          : t.inputType === "mood"
            ? t.pickMood
            : t.pick}
      </p>
      {t.inputType === "level" && (
        <div className="levels">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`level-${n} ${level === n ? "selected" : ""}`}
              onClick={() => setLevel(n)}
            >
              <b>{n}</b>
              <span>
                {[t.try, t.light, t.good, t.strong, t.bestLevel][n - 1]}
              </span>
            </button>
          ))}
        </div>
      )}
      {t.inputType === "check" && (
        <div className="check-choice">
          <button className="yes" onClick={() => onSave(true)}>
            {t.yesDid}
          </button>
          <button className="no" onClick={() => onSave(false)}>
            × {t.noDid}
          </button>
        </div>
      )}
      {t.inputType === "mood" && (
        <div className="mood-today">
          {["😄", "😊", "😐", "😔", "😴"].map((x) => (
            <button
              key={x}
              className={t.mood === x ? "selected" : ""}
              onClick={() => t.setMood(x)}
            >
              {x}
            </button>
          ))}
        </div>
      )}
      <label>
        <span>
          {t.note} <small>{t.optional}</small>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.placeholder}
        />
      </label>
      {t.inputType !== "check" && (
        <button className="save" onClick={() => onSave()}>
          {saved ? t.saved : t.save}
        </button>
      )}
      {t.hasToday && (
        <button className="reset-today" onClick={t.resetToday}>
          {t.reset}
        </button>
      )}
    </section>
  );
}
function Stats({
  t,
  wins,
  days,
}: {
  t: any;
  wins: number;
  days: number;
  avg: number;
  best: number;
  weeks: number[];
}) {
  const board = t.board as Board;
  const total = board.goalDays || days;
  const elapsed = Math.min(days, total);
  const missed = Math.max(0, elapsed - wins);
  const rate = Math.round((wins / Math.max(1, elapsed)) * 100);
  const levelCounts = [1, 2, 3, 4, 5].map(
    (n) => board.entries.filter((e) => e.value === n).length,
  );
  const moods = ["😄", "😊", "😐", "😔", "😴"];
  const label = {
    en: { period: "Goal days", elapsed: "Day now", recorded: "Days recorded" },
    ko: { period: "전체 목표", elapsed: "현재 일차", recorded: "기록한 날" },
    zh: { period: "目标天数", elapsed: "当前天数", recorded: "记录天数" },
    ja: { period: "目標日数", elapsed: "現在の日数", recorded: "記録日" },
  }[t.locale || "en"] || {
    period: "Goal days",
    elapsed: "Day now",
    recorded: "Days recorded",
  };
  return (
    <section className="stats-page friendly">
      <div className="stats-welcome">
        <div>
          <p className="eyebrow">{t.stats}</p>
          <h1>
            {rate >= 70 ? t.well : rate >= 35 ? t.returnCounts : t.restart}
          </h1>
          <p className="stats-board-dates">
            {board.startDate} ~ {endDate(board) || "∞"}
          </p>
          <div className="period-stats">
            <span>
              <b>{total}</b>
              {label.period}
            </span>
            <span>
              <b>{elapsed}</b>
              {label.elapsed}
            </span>
            <span>
              <b>{wins}</b>
              {label.recorded}
            </span>
          </div>
        </div>
        <div
          className="rate-ring"
          style={{ "--rate": `${rate * 3.6}deg` } as React.CSSProperties}
        >
          <strong>{rate}%</strong>
          <span>{t.keep}</span>
        </div>
      </div>
      <div className="type-stats">
        <div className="chart-head">
          <div>
            <h2>
              {board.inputType === "level"
                ? t.levelsChart
                : board.inputType === "check"
                  ? t.checkChart
                  : t.moodChart}
            </h2>
            <p>
              {board.inputType === "level"
                ? t.levelsHelp
                : board.inputType === "check"
                  ? t.checkChartHelp
                  : t.moodChartHelp}
            </p>
          </div>
        </div>
        {board.inputType === "level" && (
          <div className="level-distribution">
            {levelCounts.map((count, i) => (
              <div key={i}>
                <i
                  className={`level-${i + 1}`}
                  style={{
                    height: `${Math.max(8, (count / Math.max(...levelCounts, 1)) * 100)}%`,
                  }}
                />
                <b>{count}</b>
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        )}
        {board.inputType === "check" && (
          <div className="check-distribution">
            <div style={{ "--part": `${rate}%` } as React.CSSProperties} />
            <p>
              <b>{wins}</b> {t.done} <span>·</span> {missed} {t.notRecorded}
            </p>
          </div>
        )}
        {board.inputType === "mood" && (
          <div className="mood-distribution">
            {moods.map((x) => (
              <div key={x}>
                <b>{x}</b>
                <span>{board.entries.filter((e) => e.emoji === x).length}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function RewardPreview({ locale }: { locale: Locale }) {
  const c = {
    en: {
      grade: "GRADE & BADGES",
      title: "Every complete board grows your collection.",
      help: "Each recorded day gives 1 XP at finish. Grades add plant species. Badges add colors.",
      earned: "2 badges earned",
    },
    ko: {
      grade: "등급과 배지",
      title: "보드를 완료할수록 컬렉션이 자라요.",
      help: "완료 시 기록한 하루마다 1 XP예요. 등급은 식물 종류, 배지는 색상을 늘려요.",
      earned: "배지 2개 획득",
    },
    zh: {
      grade: "等级和徽章",
      title: "每完成一个面板，收藏都会成长。",
      help: "完成时每个记录日获得1 XP，等级增加植物种类，徽章增加颜色。",
      earned: "已获得2个徽章",
    },
    ja: {
      grade: "等級とバッジ",
      title: "ボードを完了するたびコレクションが育ちます。",
      help: "完了時に記録した1日につき1 XP。等級は植物の種類、バッジは色を増やします。",
      earned: "バッジ2個獲得",
    },
  }[locale];
  return (
    <section className="reward-preview">
      <div>
        <p className="eyebrow">{c.grade}</p>
        <h2>{c.title}</h2>
        <p>{c.help}</p>
      </div>
      <div className="preview-grade">
        <b>{gradeNames[locale].SPROUT}</b>
        <span>6 XP</span>
      </div>
      <div className="preview-badges">
        <span>✓ Visitor</span>
        <span>✓ Pixel</span>
        <small>{c.earned}</small>
      </div>
      <div className="preview-pool">
        <i style={{ background: "#159651" }} />
        <i style={{ background: "#4F8FD8" }} />
        <i style={{ background: "#D6763E" }} />
        <b>♣ ♜ ✿</b>
      </div>
    </section>
  );
}

function GuideSamples({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "SEE IT BEFORE YOU START",
      title: "Three boards. One simple daily action.",
      level: "Level board",
      check: "Yes / No board",
      mood: "Mood board",
      garden: "Garden and collection",
      gardenHelp:
        "Active boards grow here. Completed plants move to your permanent collection.",
      list: "Board list",
      map: "Garden map",
    },
    ko: {
      eye: "시작 전에 미리 보기",
      title: "세 가지 보드, 하루 한 번의 간단한 기록",
      level: "1–5 단계 보드",
      check: "예 / 아니요 보드",
      mood: "기분 보드",
      garden: "가든과 식물원",
      gardenHelp:
        "활성 보드는 여기서 자라고 완료 식물은 영구 컬렉션으로 이동해요.",
      list: "보드 목록",
      map: "가든 지도",
    },
    zh: {
      eye: "开始前预览",
      title: "三种面板，每天一次简单记录",
      level: "1–5等级面板",
      check: "是/否面板",
      mood: "心情面板",
      garden: "花园和收藏",
      gardenHelp: "活动面板在这里成长，完成的植物进入永久收藏。",
      list: "面板列表",
      map: "花园地图",
    },
    ja: {
      eye: "始める前に確認",
      title: "3種類のボード、1日1回の簡単な記録",
      level: "1〜5ボード",
      check: "はい/いいえボード",
      mood: "気分ボード",
      garden: "ガーデンと温室",
      gardenHelp:
        "進行中ボードはここで育ち、完了した植物は永久コレクションへ移ります。",
      list: "ボード一覧",
      map: "ガーデン地図",
    },
  }[locale];
  const values = [1, 3, 5, 2, 4, 0, 3, 5, 1, 4, 2, 5, 0, 3];
  return (
    <section className="guide-samples">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <div className="sample-board-grid">
        <article>
          <b>1–5</b>
          <h3>{c.level}</h3>
          <div>
            {values.map((n, i) => (
              <i key={i} className={n ? `level-${n}` : ""} />
            ))}
          </div>
        </article>
        <article>
          <b>✓</b>
          <h3>{c.check}</h3>
          <div>
            {values.map((n, i) => (
              <i key={i} className={n % 2 ? "level-5" : ""} />
            ))}
          </div>
        </article>
        <article>
          <b>☺</b>
          <h3>{c.mood}</h3>
          <div>
            {[
              "😊",
              "😄",
              "",
              "😐",
              "😊",
              "",
              "😴",
              "😊",
              "",
              "😄",
              "😐",
              "",
              "😊",
              "😄",
            ].map((v, i) => (
              <i key={i}>{v}</i>
            ))}
          </div>
        </article>
      </div>
      <div className="sample-garden">
        <div>
          <h3>{c.garden}</h3>
          <p>{c.gardenHelp}</p>
          <span>{c.list}</span>
          <span>{c.map}</span>
        </div>
        <div className="sample-land">
          ♣ <i>✿</i> ♜ <i>♧</i> ♠
        </div>
      </div>
      <RewardPreview locale={locale} />
    </section>
  );
}

function GuideRewardRules({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "PLANTS, XP & BADGES",
      title: "Complete boards. Grow what can appear next.",
      xpUnit: "1 RECORD = 1 XP",
      xp: "How XP works",
      xpText:
        "Finish a board once to receive 1 XP for each recorded day. A missed day gives 0 XP. Badges do not give XP.",
      grades: "Grades unlock more plant species",
      badges: "Badges unlock more plant colors",
      garden: "Growing Garden",
      gardenText:
        "Every active board grows here. It is a preview, not a permanent plant yet.",
      collection: "Conservatory",
      collectionText:
        "Complete a board to draw one plant. It stays in your permanent collection and Garden Map.",
    },
    ko: {
      eye: "식물, XP와 배지",
      title: "보드를 완료하고 다음 식물의 가능성을 키워요.",
      xpUnit: "1 기록 = 1 XP",
      xp: "XP를 받는 방법",
      xpText:
        "보드를 완료할 때 기록한 하루마다 1 XP를 한 번 받아요. 기록하지 않은 날은 0 XP이며 배지는 XP를 주지 않아요.",
      grades: "등급이 오르면 식물 종류가 늘어요",
      badges: "배지를 얻으면 식물 색상이 늘어요",
      garden: "성장 중 가든",
      gardenText:
        "진행 중인 모든 보드가 여기서 자라요. 아직 영구 식물이 아닌 성장 미리보기예요.",
      collection: "완료 식물원",
      collectionText:
        "보드를 완료하면 식물 하나를 추첨해요. 받은 식물은 영구 컬렉션과 가든 지도에 남아요.",
    },
    zh: {
      eye: "植物、XP和徽章",
      title: "完成面板，扩大下一株植物的可能。",
      xpUnit: "1 条记录 = 1 XP",
      xp: "如何获得XP",
      xpText:
        "完成面板时，每个已记录日期获得1 XP。未记录日期为0 XP，徽章不提供XP。",
      grades: "等级解锁更多植物种类",
      badges: "徽章解锁更多植物颜色",
      garden: "成长花园",
      gardenText: "所有活动面板都在这里成长，但还不是永久植物。",
      collection: "完成植物园",
      collectionText:
        "完成面板后随机获得一株植物，并永久保存在收藏和花园地图中。",
    },
    ja: {
      eye: "植物・XP・バッジ",
      title: "ボードを完了して次の植物の可能性を増やします。",
      xpUnit: "1 記録 = 1 XP",
      xp: "XPの受け取り方",
      xpText:
        "ボード完了時に、記録した1日につき1 XPを一度だけ受け取ります。未記録日は0 XPで、バッジはXPを付与しません。",
      grades: "等級で植物の種類が増えます",
      badges: "バッジで植物の色が増えます",
      garden: "成長中ガーデン",
      gardenText:
        "進行中の全ボードがここで育ちます。まだ永久植物ではありません。",
      collection: "完了した温室",
      collectionText:
        "ボード完了時に植物を一つ抽選し、コレクションと地図に永久保存します。",
    },
  }[locale];
  const grades = [
    ["SEED", 0, 2],
    ["SPROUT", 5, 4],
    ["GROVE", 10, 6],
    ["GARDENER", 20, 8],
    ["BOTANIST", 30, 10],
    ["CONSERVATOR", 50, 12],
  ];
  const badges = [
    ["Visitor", "7 days", "#4F8FD8"],
    ["Pixel", "30 records", "#D6763E"],
    ["Gardener", "3 plants", "#8967C7"],
    ["Collector", "4 species", "#C85F7A"],
    ["Perfect", "100% complete", "#D3A62B"],
    ["Notebook", "20 notes", "#54BFA3"],
    ["Steady Week", "7-day streak", "#2F8C83"],
    ["Three Ways", "3 board types", "#5666A5"],
    ["Long Journey", "90-day board", "#D96F62"],
    ["Hundred Pixels", "100 records", "#B94C5B"],
    ["Full Garden", "10 plants", "#62707D"],
  ];
  return (
    <section className="guide-reward-rules">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <article className="xp-rule">
        <b>{c.xpUnit}</b>
        <div>
          <h3>{c.xp}</h3>
          <p>{c.xpText}</p>
        </div>
      </article>
      <h3>{c.grades}</h3>
      <div className="guide-grade-grid">
        {grades.map(([code, xp, count]) => (
          <article key={code}>
            <b>{gradeNames[locale][String(code)]}</b>
            <span>{xp} XP</span>
            <strong>{count} species</strong>
          </article>
        ))}
      </div>
      <h3>{c.badges}</h3>
      <div className="guide-badge-list">
        {badges.map(([name, target, color]) => (
          <article key={name}>
            <i style={{ background: String(color) }} />
            <b>{name}</b>
            <span>{target}</span>
            <small>+1 color</small>
          </article>
        ))}
      </div>
      <div className="garden-guide-pair">
        <article>
          <p className="eyebrow">{c.garden}</p>
          <div className="growing-demo">
            <span>♣</span>
            <span>♜</span>
            <span>✿</span>
          </div>
          <h3>{c.garden}</h3>
          <p>{c.gardenText}</p>
        </article>
        <b>→</b>
        <article>
          <p className="eyebrow">{c.collection}</p>
          <div className="collection-demo">
            <span>♣</span>
            <span>♜</span>
            <span>✿</span>
            <span>♠</span>
            <span>❀</span>
            <span>♧</span>
          </div>
          <h3>{c.collection}</h3>
          <p>{c.collectionText}</p>
        </article>
      </div>
    </section>
  );
}

function GuideDetails({ locale }: { locale: Locale }) {
  const c = {
    en: {
      score: "Exact XP formula",
      formula:
        "Each recorded day gives 1 XP when the board is completed. A 30-day board with 5 recorded days gives 5 XP. Missed days and notes add no XP. Completion rate remains a percentage in Stats only. For an endless board, elapsed days at completion become the goal days.",
      badge: "Exact badge conditions",
    },
    ko: {
      score: "정확한 XP 계산식",
      formula:
        "보드를 완료하면 기록한 하루마다 1 XP를 받아요. 30일 보드에서 5일을 기록하면 5 XP예요. 미기록일과 메모는 XP를 더하지 않아요. 완료율은 통계에서만 퍼센트로 보여요. 무기한 보드는 완료 시점까지 지난 일수를 목표일로 계산해요.",
      badge: "배지별 정확한 달성 조건",
    },
    zh: {
      score: "XP精确公式",
      formula:
        "完成面板时，每个记录日获得1 XP。30天记录5天可得5 XP。未记录日和笔记不增加XP。完成率只在统计中显示为百分比。",
      badge: "徽章的准确条件",
    },
    ja: {
      score: "XPの正確な計算式",
      formula:
        "ボード完了時、記録した1日につき1 XPを獲得します。30日で5日記録すると5 XPです。未記録日とメモはXPを増やしません。完了率は統計だけに％で表示します。",
      badge: "バッジの正確な条件",
    },
  }[locale];
  const rules = {
    en: [
      "Visitor — open PixelLife on 7 different calendar days.",
      "Pixel — save 30 daily records in total.",
      "Gardener — complete 3 boards and collect 3 plants.",
      "Collector — collect 4 different plant species.",
      "Perfect — record every goal day and finish one board at 100%.",
      "Notebook — save 20 records with a note.",
      "Steady Week — record 7 consecutive calendar days.",
      "Three Ways — complete Level, Yes/No, and Mood boards.",
      "Long Journey — complete a board whose goal is 90 days or longer.",
      "Hundred Pixels — save 100 daily records in total.",
      "Full Garden — complete 10 boards and collect 10 plants.",
    ],
    ko: [
      "Visitor — 서로 다른 날짜에 7일 방문해요.",
      "Pixel — 일일 기록을 누적 30개 저장해요.",
      "Gardener — 보드 3개를 완료해 식물 3개를 모아요.",
      "Collector — 서로 다른 식물 종류 4개를 모아요.",
      "Perfect — 목표일을 모두 기록해 완료율 100%로 보드 하나를 완료해요.",
      "Notebook — 메모가 있는 기록을 20개 저장해요.",
      "Steady Week — 달력 날짜 기준 7일 연속 기록해요.",
      "Three Ways — 1–5, 예/아니요, 기분 보드를 각각 완료해요.",
      "Long Journey — 목표 기간이 90일 이상인 보드를 완료해요.",
      "Hundred Pixels — 일일 기록을 누적 100개 저장해요.",
      "Full Garden — 보드 10개를 완료해 식물 10개를 모아요.",
    ],
    zh: [
      "Visitor — 在7个不同日期访问。",
      "Pixel — 累计保存30条每日记录。",
      "Gardener — 完成3个面板并收集3株植物。",
      "Collector — 收集4种不同植物。",
      "Perfect — 记录全部目标日并以100%完成一个面板。",
      "Notebook — 保存20条带笔记的记录。",
      "Steady Week — 连续7个日历日记录。",
      "Three Ways — 分别完成三种面板。",
      "Long Journey — 完成目标90天以上的面板。",
      "Hundred Pixels — 累计保存100条记录。",
      "Full Garden — 完成10个面板并收集10株植物。",
    ],
    ja: [
      "Visitor — 異なる7日間に訪問します。",
      "Pixel — 毎日の記録を累計30件保存します。",
      "Gardener — 3ボードを完了し植物を3個集めます。",
      "Collector — 異なる植物4種類を集めます。",
      "Perfect — 目標日をすべて記録し100%で1ボードを完了します。",
      "Notebook — メモ付き記録を20件保存します。",
      "Steady Week — 暦日で7日連続記録します。",
      "Three Ways — 3種類のボードを完了します。",
      "Long Journey — 90日以上のボードを完了します。",
      "Hundred Pixels — 記録を累計100件保存します。",
      "Full Garden — 10ボードを完了し植物を10個集めます。",
    ],
  }[locale];
  return (
    <section className="guide-details">
      <article>
        <p className="eyebrow">XP</p>
        <h2>{c.score}</h2>
        <p>{c.formula}</p>
      </article>
      <article>
        <p className="eyebrow">BADGES</p>
        <h2>{c.badge}</h2>
        <ol>
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </article>
    </section>
  );
}

function GuideGardenActual({ locale }: { locale: Locale }) {
  const t = { ...extraWords[locale], ...screenWords[locale] };
  const demoBoards: Board[] = [
    {
      id: "g1",
      title: "Read every day",
      inputType: "level",
      startDate: today,
      createdAt: today,
      goalDays: 30,
      entries: Array.from({ length: 9 }, (_, i) => ({
        date: key(day(-i)),
        value: (i % 5) + 1,
      })),
      color: "#159651",
      status: "ACTIVE",
    },
    {
      id: "g2",
      title: "No spend day",
      inputType: "check",
      startDate: today,
      createdAt: today,
      goalDays: 30,
      entries: Array.from({ length: 4 }, (_, i) => ({
        date: key(day(-i)),
        value: 1,
      })),
      color: "#3878D8",
      status: "ACTIVE",
    },
  ];
  const demoPlants: RewardPlant[] = [
    {
      id: 1,
      speciesCode: "OAK",
      speciesName: "Oak",
      symbol: "♣",
      colorCode: "GREEN",
      cssColor: "#159651",
      mapX: 0,
      mapY: 0,
      earnedAt: today,
      boardId: 1,
      boardName: "Morning walk",
      xpAwarded: 9,
    },
    {
      id: 2,
      speciesCode: "TULIP",
      speciesName: "Tulip",
      symbol: "✿",
      colorCode: "SKY",
      cssColor: "#4F8FD8",
      mapX: 1,
      mapY: 0,
      earnedAt: today,
      boardId: 2,
      boardName: "Read books",
      xpAwarded: 10,
    },
    {
      id: 3,
      speciesCode: "CACTUS",
      speciesName: "Cactus",
      symbol: "♜",
      colorCode: "ORANGE",
      cssColor: "#D6763E",
      mapX: 2,
      mapY: 1,
      earnedAt: today,
      boardId: 3,
      boardName: "Save money",
      xpAwarded: 8,
    },
  ];
  return (
    <section className="guide-actual-garden">
      <Garden
        boards={demoBoards}
        plants={demoPlants}
        t={t}
        onGrowing={() => {}}
        onComplete={() => {}}
      />
    </section>
  );
}

function GuideProgressGuide({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "XP, GRADES & BADGES",
      title: "One clear reward system",
      xpUnit: "1 RECORD = 1 XP",
      xp: "How to earn XP",
      formula:
        "XP is 1 per recorded day and is awarded once when the board is completed. A 30-day board with 5 records gives 5 XP. Completion rate is shown only as a percentage in Stats. Missed days, notes, and badges give no XP.",
      grades: "XP grade and random plant pool",
      badges: "Each badge card shows its exact goal and new color.",
    },
    ko: {
      eye: "XP, 등급과 배지",
      title: "하나로 이해하는 보상 방식",
      xpUnit: "1 기록 = 1 XP",
      xp: "XP를 받는 방법",
      formula:
        "보드를 완료할 때 기록한 하루마다 1 XP를 받아요. 30일 보드에 5일 기록하면 5 XP예요. 완료율은 통계에서만 퍼센트로 보여요. 미기록일, 메모와 배지는 XP를 주지 않아요.",
      grades: "XP 등급과 랜덤 식물 종류",
      badges: "각 배지 카드에서 정확한 목표와 추가 색상을 확인해요.",
    },
    zh: {
      eye: "XP、等级和徽章",
      title: "简单统一的奖励规则",
      xpUnit: "1 条记录 = 1 XP",
      xp: "如何获得XP",
      formula:
        "完成面板时，每个记录日获得1 XP。30天记录5天可得5 XP。完成率只在统计中显示为百分比。未记录日、笔记和徽章不提供XP。",
      grades: "XP等级和随机植物池",
      badges: "每张徽章卡显示准确目标和新增颜色。",
    },
    ja: {
      eye: "XP・等級・バッジ",
      title: "一つで分かる報酬ルール",
      xpUnit: "1 記録 = 1 XP",
      xp: "XPの受け取り方",
      formula:
        "完了時に記録した1日につき1 XPを受け取ります。30日で5日記録なら5 XPです。完了率は統計だけに％で表示します。未記録日、メモ、バッジはXPを付与しません。",
      grades: "XP等級とランダム植物プール",
      badges: "各バッジカードに正確な目標と追加色を表示します。",
    },
  }[locale];
  const grades = [
    ["Seed", 0, 2],
    ["Sprout", 5, 4],
    ["Grove", 10, 6],
    ["Gardener", 20, 8],
    ["Botanist", 30, 10],
    ["Conservator", 50, 12],
  ];
  const details = {
    en: [
      ["Visitor", "Visit on 7 different calendar days.", "Sky"],
      ["Pixel", "Save 30 daily records in total.", "Orange"],
      ["Gardener", "Complete 3 boards and collect 3 plants.", "Violet"],
      ["Collector", "Collect 4 different plant species.", "Rose"],
      ["Perfect", "Record every goal day and finish at 100%.", "Gold"],
      ["Notebook", "Save 20 records that include a note.", "Mint"],
      ["Steady Week", "Record on 7 consecutive calendar days.", "Teal"],
      ["Three Ways", "Complete Level, Yes/No, and Mood boards.", "Indigo"],
      [
        "Long Journey",
        "Complete a board with a goal of 90 days or more.",
        "Coral",
      ],
      ["Hundred Pixels", "Save 100 daily records in total.", "Ruby"],
      ["Full Garden", "Complete 10 boards and collect 10 plants.", "Slate"],
    ],
    ko: [
      ["Visitor", "서로 다른 날짜에 7일 방문해요.", "Sky"],
      ["Pixel", "일일 기록을 누적 30개 저장해요.", "Orange"],
      ["Gardener", "보드 3개를 완료해 식물 3개를 모아요.", "Violet"],
      ["Collector", "서로 다른 식물 종류 4개를 모아요.", "Rose"],
      ["Perfect", "목표일을 모두 기록해 완료율 100%로 완료해요.", "Gold"],
      ["Notebook", "메모가 있는 기록을 20개 저장해요.", "Mint"],
      ["Steady Week", "달력 날짜 기준 7일 연속 기록해요.", "Teal"],
      ["Three Ways", "1–5, 예/아니요, 기분 보드를 각각 완료해요.", "Indigo"],
      ["Long Journey", "목표가 90일 이상인 보드를 완료해요.", "Coral"],
      ["Hundred Pixels", "일일 기록을 누적 100개 저장해요.", "Ruby"],
      ["Full Garden", "보드 10개를 완료해 식물 10개를 모아요.", "Slate"],
    ],
    zh: [
      ["Visitor", "在7个不同日期访问。", "Sky"],
      ["Pixel", "累计保存30条每日记录。", "Orange"],
      ["Gardener", "完成3个面板并收集3株植物。", "Violet"],
      ["Collector", "收集4种不同植物。", "Rose"],
      ["Perfect", "记录全部目标日并以100%完成。", "Gold"],
      ["Notebook", "保存20条带笔记的记录。", "Mint"],
      ["Steady Week", "连续7个日历日记录。", "Teal"],
      ["Three Ways", "完成三种面板。", "Indigo"],
      ["Long Journey", "完成目标90天以上的面板。", "Coral"],
      ["Hundred Pixels", "累计保存100条记录。", "Ruby"],
      ["Full Garden", "完成10个面板。", "Slate"],
    ],
    ja: [
      ["Visitor", "異なる7日間に訪問します。", "Sky"],
      ["Pixel", "記録を累計30件保存します。", "Orange"],
      ["Gardener", "3ボードを完了します。", "Violet"],
      ["Collector", "異なる植物4種類を集めます。", "Rose"],
      ["Perfect", "目標日をすべて記録し100%で完了します。", "Gold"],
      ["Notebook", "メモ付き記録を20件保存します。", "Mint"],
      ["Steady Week", "7日連続で記録します。", "Teal"],
      ["Three Ways", "3種類のボードを完了します。", "Indigo"],
      ["Long Journey", "90日以上のボードを完了します。", "Coral"],
      ["Hundred Pixels", "記録を累計100件保存します。", "Ruby"],
      ["Full Garden", "10ボードを完了します。", "Slate"],
    ],
  }[locale];
  const colors = [
    "#4F8FD8",
    "#D6763E",
    "#8967C7",
    "#C85F7A",
    "#D3A62B",
    "#54BFA3",
    "#2F8C83",
    "#5666A5",
    "#D96F62",
    "#B94C5B",
    "#62707D",
  ];
  return (
    <section className="guide-progress">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <article className="guide-xp">
        <b>{c.xpUnit}</b>
        <div>
          <h3>{c.xp}</h3>
          <p>{c.formula}</p>
        </div>
      </article>
      <h3>{c.grades}</h3>
      <div className="guide-grade-grid">
        {grades.map(([name, xp, count]) => (
          <article key={name}>
            <b>{name}</b>
            <span>{xp} XP</span>
            <strong>{count} species</strong>
          </article>
        ))}
      </div>
      <h3>{c.badges}</h3>
      <div className="guide-badge-cards">
        {details.map(([name, rule, color], i) => (
          <article key={name}>
            <i style={{ background: colors[i] }} />
            <div>
              <b>{name}</b>
              <p>{rule}</p>
            </div>
            <small>+1 {color}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideSpeciesPools({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "12 PLANT SPECIES",
      title: "Your grade grows the random plant pool.",
      help: "The pool is cumulative. Seed starts with 2 species. Conservator can draw all 12. Species have different published weights, so they are not equally likely.",
      total: "species available",
    },
    ko: {
      eye: "식물 12종",
      title: "등급이 오르면 랜덤 식물 풀이 커져요.",
      help: "식물 종류는 누적 해금돼요. Seed는 2종으로 시작하고 Conservator는 12종 전체에서 추첨해요. 식물마다 공개된 가중치가 달라 동일 확률은 아니에요.",
      total: "종 추첨 가능",
    },
    zh: {
      eye: "12种植物",
      title: "等级越高，随机植物池越大。",
      help: "植物会累计解锁。Seed从2种开始，Conservator可从全部12种抽取。每种植物权重不同，并非相同概率。",
      total: "种可抽取",
    },
    ja: {
      eye: "植物12種類",
      title: "等級が上がるとランダム植物プールが広がります。",
      help: "植物は累積で解放されます。Seedは2種類、Conservatorは全12種類から抽選します。公開ウェイトが異なるため同確率ではありません。",
      total: "種類抽選可能",
    },
  }[locale];
  const all = [
    ["♣", "Oak"],
    ["♜", "Cactus"],
    ["✿", "Tulip"],
    ["♠", "Pine"],
    ["♧", "Fern"],
    ["✹", "Sunflower"],
    ["♣", "Maple"],
    ["❀", "Lotus"],
    ["≋", "Bamboo"],
    ["❋", "Cherry"],
    ["♨", "Palm"],
    ["✦", "Crystal Plant"],
  ];
  const grades = [
    ["Seed", 2],
    ["Sprout", 4],
    ["Grove", 6],
    ["Gardener", 8],
    ["Botanist", 10],
    ["Conservator", 12],
  ] as const;
  return (
    <section className="guide-species">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <p>{c.help}</p>
      <div>
        {grades.map(([grade, count]) => (
          <article key={grade}>
            <header>
              <b>{grade}</b>
              <span>
                {count} {c.total}
              </span>
            </header>
            <div>
              {all.slice(0, count).map(([symbol, name], i) => (
                <span
                  className={i >= count - 2 ? "new" : ""}
                  key={`${grade}-${name}`}
                >
                  <i>{symbol}</i>
                  <small>{name}</small>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideRewardCombined({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "XP, GRADES & PLANTS",
      title: "Complete boards. Grow your plant pool.",
      xpUnit: "1 RECORD = 1 XP",
      xp: "How to earn XP",
      formula:
        "When you finish, each recorded day gives 1 XP once. Completion rate is shown only as a percentage in Stats. A missed day gives 0 XP.",
      grades: "XP grade and random plant species",
      equal: "All unlocked species have the same draw chance.",
      badges: "Badges add one new plant color.",
      baseColors: "Available from the start",
      species: "species",
      green: "Green",
      cream: "Cream",
      colorPlus: "+1",
    },
    ko: {
      eye: "XP, 등급과 식물",
      title: "보드를 완료하고 식물 풀을 키워요.",
      xpUnit: "1 기록 = 1 XP",
      xp: "XP를 받는 방법",
      formula:
        "보드를 완료하면 기록한 하루마다 1 XP를 한 번 받아요. 완료율은 통계에서만 퍼센트로 보여주고, 기록하지 않은 날은 0 XP예요.",
      grades: "XP 등급과 랜덤 식물 종류",
      equal: "해금된 모든 식물은 동일한 확률로 추첨돼요.",
      badges: "배지는 식물 색상을 하나씩 추가해요.",
      baseColors: "처음부터 사용 가능한 색상",
      species: "종",
      green: "초록색",
      cream: "크림색",
      colorPlus: "+1 색상",
    },
    zh: {
      eye: "XP、等级和植物",
      title: "完成面板，扩大植物池。",
      xpUnit: "1 条记录 = 1 XP",
      xp: "如何获得XP",
      formula:
        "完成面板时，每个记录日获得1 XP。完成率只在统计中显示为百分比，未记录日为0 XP。",
      grades: "XP等级和随机植物种类",
      equal: "所有已解锁植物的抽取概率相同。",
      badges: "徽章会增加一种植物颜色。",
      baseColors: "从一开始即可使用的颜色",
      species: "种",
      green: "绿色",
      cream: "奶油色",
      colorPlus: "+1 颜色",
    },
    ja: {
      eye: "XP・等級・植物",
      title: "ボードを完了して植物プールを育てます。",
      xpUnit: "1 記録 = 1 XP",
      xp: "XPの受け取り方",
      formula:
        "完了時に記録した1日につき1 XPを受け取ります。完了率は統計だけに％で表示し、未記録日は0 XPです。",
      grades: "XP等級とランダム植物種類",
      equal: "解放済み植物はすべて同じ確率で抽選されます。",
      badges: "バッジは植物カラーを一つ追加します。",
      baseColors: "最初から利用できるカラー",
      species: "種類",
      green: "緑",
      cream: "クリーム",
      colorPlus: "+1 色",
    },
  }[locale];
  const plants = [
    ["♣", "Oak"],
    ["♜", "Cactus"],
    ["✿", "Tulip"],
    ["♠", "Pine"],
    ["♧", "Fern"],
    ["✹", "Sunflower"],
    ["❈", "Maple"],
    ["❀", "Lotus"],
    ["≋", "Bamboo"],
    ["❋", "Cherry"],
    ["♨", "Palm"],
    ["✦", "Crystal Plant"],
  ];
  const guidePlantNames: Record<Locale, Record<string, string>> = {
    en: {},
    ko: { Oak: "참나무", Cactus: "선인장", Tulip: "튤립", Pine: "소나무", Fern: "고사리", Sunflower: "해바라기", Maple: "단풍나무", Lotus: "연꽃", Bamboo: "대나무", Cherry: "벚나무", Palm: "야자나무", "Crystal Plant": "수정 식물" },
    zh: { Oak: "橡树", Cactus: "仙人掌", Tulip: "郁金香", Pine: "松树", Fern: "蕨类", Sunflower: "向日葵", Maple: "枫树", Lotus: "莲花", Bamboo: "竹子", Cherry: "樱花树", Palm: "棕榈树", "Crystal Plant": "水晶植物" },
    ja: { Oak: "オーク", Cactus: "サボテン", Tulip: "チューリップ", Pine: "松", Fern: "シダ", Sunflower: "ひまわり", Maple: "カエデ", Lotus: "蓮", Bamboo: "竹", Cherry: "桜", Palm: "ヤシ", "Crystal Plant": "クリスタル植物" },
  };
  const guideGradeNames: Record<Locale, Record<string, string>> = {
    en: {},
    ko: { Seed: "씨앗", Sprout: "새싹", Grove: "숲", Gardener: "정원사", Botanist: "식물학자", Conservator: "보존가" },
    zh: { Seed: "种子", Sprout: "新芽", Grove: "树林", Gardener: "园丁", Botanist: "植物学家", Conservator: "守护者" },
    ja: { Seed: "種", Sprout: "芽", Grove: "木立", Gardener: "庭師", Botanist: "植物学者", Conservator: "保全者" },
  };
  const guideBadgeNames: Record<Locale, Record<string, string>> = {
    en: {},
    ko: { Visitor: "방문자", Pixel: "픽셀", Gardener: "정원사", Collector: "수집가", Perfect: "완벽", Notebook: "기록가", "Steady Week": "꾸준한 한 주", "Three Ways": "세 가지 방식", "Long Journey": "긴 여정", "Hundred Pixels": "백 개의 픽셀", "Full Garden": "가득 찬 정원" },
    zh: { Visitor: "访客", Pixel: "像素", Gardener: "园丁", Collector: "收藏家", Perfect: "完美", Notebook: "记录者", "Steady Week": "稳定一周", "Three Ways": "三种方式", "Long Journey": "漫长旅程", "Hundred Pixels": "百个像素", "Full Garden": "满园" },
    ja: { Visitor: "訪問者", Pixel: "ピクセル", Gardener: "庭師", Collector: "収集家", Perfect: "パーフェクト", Notebook: "記録家", "Steady Week": "安定した一週間", "Three Ways": "三つの方法", "Long Journey": "長い旅", "Hundred Pixels": "百個のピクセル", "Full Garden": "満開の庭" },
  };
  const guideColorNames: Record<Locale, Record<string, string>> = {
    en: {},
    ko: { Sky: "하늘색", Orange: "주황색", Violet: "보라색", Rose: "장미색", Gold: "금색", Mint: "민트색", Teal: "청록색", Indigo: "남색", Coral: "코랄색", Ruby: "루비색", Slate: "회청색" },
    zh: { Sky: "天蓝", Orange: "橙色", Violet: "紫色", Rose: "玫瑰色", Gold: "金色", Mint: "薄荷色", Teal: "蓝绿色", Indigo: "靛蓝", Coral: "珊瑚色", Ruby: "宝石红", Slate: "石板灰" },
    ja: { Sky: "空色", Orange: "オレンジ", Violet: "紫", Rose: "ローズ", Gold: "ゴールド", Mint: "ミント", Teal: "青緑", Indigo: "藍色", Coral: "コーラル", Ruby: "ルビー", Slate: "スレート" },
  };
  const grades = [
    ["Seed", 0, 2],
    ["Sprout", 5, 4],
    ["Grove", 10, 6],
    ["Gardener", 20, 8],
    ["Botanist", 30, 10],
    ["Conservator", 50, 12],
  ] as const;
  const badgeRules = {
    en: [
      ["Visitor", "Visit on 7 different days.", "Sky"],
      ["Pixel", "Save 30 daily records.", "Orange"],
      ["Gardener", "Complete 3 boards.", "Violet"],
      ["Collector", "Collect 4 species.", "Rose"],
      ["Perfect", "Record every goal day and finish at 100%.", "Gold"],
      ["Notebook", "Write 20 notes.", "Mint"],
      ["Steady Week", "Record 7 days in a row.", "Teal"],
      ["Three Ways", "Complete all 3 board types.", "Indigo"],
      ["Long Journey", "Complete a 90+ day board.", "Coral"],
      ["Hundred Pixels", "Save 100 daily records.", "Ruby"],
      ["Full Garden", "Complete 10 boards.", "Slate"],
    ],
    ko: [
      ["Visitor", "서로 다른 날짜에 7일 방문해요.", "Sky"],
      ["Pixel", "일일 기록 30개를 저장해요.", "Orange"],
      ["Gardener", "보드 3개를 완료해요.", "Violet"],
      ["Collector", "식물 4종을 모아요.", "Rose"],
      ["Perfect", "목표일을 모두 기록해 완료율 100%로 완료해요.", "Gold"],
      ["Notebook", "메모 20개를 작성해요.", "Mint"],
      ["Steady Week", "7일 연속 기록해요.", "Teal"],
      ["Three Ways", "보드 3종을 모두 완료해요.", "Indigo"],
      ["Long Journey", "90일 이상 보드를 완료해요.", "Coral"],
      ["Hundred Pixels", "일일 기록 100개를 저장해요.", "Ruby"],
      ["Full Garden", "보드 10개를 완료해요.", "Slate"],
    ],
    zh: [
      ["Visitor", "在7个不同日期访问。", "Sky"],
      ["Pixel", "保存30条记录。", "Orange"],
      ["Gardener", "完成3个面板。", "Violet"],
      ["Collector", "收集4种植物。", "Rose"],
      ["Perfect", "记录全部目标日并以100%完成。", "Gold"],
      ["Notebook", "写20条笔记。", "Mint"],
      ["Steady Week", "连续记录7天。", "Teal"],
      ["Three Ways", "完成3种面板。", "Indigo"],
      ["Long Journey", "完成90天以上面板。", "Coral"],
      ["Hundred Pixels", "保存100条记录。", "Ruby"],
      ["Full Garden", "完成10个面板。", "Slate"],
    ],
    ja: [
      ["Visitor", "異なる7日間に訪問。", "Sky"],
      ["Pixel", "記録を30件保存。", "Orange"],
      ["Gardener", "3ボードを完了。", "Violet"],
      ["Collector", "植物を4種類収集。", "Rose"],
      ["Perfect", "目標日をすべて記録し100%で完了。", "Gold"],
      ["Notebook", "メモを20件作成。", "Mint"],
      ["Steady Week", "7日連続記録。", "Teal"],
      ["Three Ways", "3種類を完了。", "Indigo"],
      ["Long Journey", "90日以上を完了。", "Coral"],
      ["Hundred Pixels", "記録を100件保存。", "Ruby"],
      ["Full Garden", "10ボードを完了。", "Slate"],
    ],
  }[locale];
  const colors = [
    "#4F8FD8",
    "#D6763E",
    "#8967C7",
    "#C85F7A",
    "#D3A62B",
    "#54BFA3",
    "#2F8C83",
    "#5666A5",
    "#D96F62",
    "#B94C5B",
    "#62707D",
  ];
  return (
    <section className="guide-reward-combined">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <article className="guide-xp">
        <b>{c.xpUnit}</b>
        <div>
          <h3>{c.xp}</h3>
          <p>{c.formula}</p>
        </div>
      </article>
      <div className="combined-heading">
        <h3>{c.grades}</h3>
        <p>{c.equal}</p>
      </div>
      <div className="grade-plant-pools">
        {grades.map(([grade, xp, count]) => (
          <article key={grade}>
            <header>
              <div>
                <b>{guideGradeNames[locale][grade] || grade}</b>
                <span>
                  {xp} XP · {count} {c.species}
                </span>
              </div>
            </header>
            <div>
              {plants.slice(0, count).map(([symbol, name], index) => (
                <span
                  className={index >= count - 2 ? "new" : ""}
                  key={`${grade}-${name}`}
                >
                  <i>{symbol}</i>
                  <small>{guidePlantNames[locale][name] || name}</small>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <h3>{c.badges}</h3>
      <div className="base-color-row">
        <span>{c.baseColors}</span>
        <b><i style={{ background: "#159651" }} />{c.green}</b>
        <b><i style={{ background: "#D8CFAF" }} />{c.cream}</b>
      </div>
      <div className="guide-badge-cards">
        {badgeRules.map(([name, rule, color], i) => (
          <article key={name}>
            <i style={{ background: colors[i] }} />
            <div>
              <b>{guideBadgeNames[locale][name] || name}</b>
              <p>{rule}</p>
            </div>
            <small>{c.colorPlus} · {guideColorNames[locale][color] || color}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function MembershipGuidePlan({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "MEMBERSHIP",
      title: "Keep it simple.",
      guest: "Guest",
      free: "Free",
      plus: "Plus",
      guestItems: [
        "Up to 3 active boards",
        "This browser only",
        "No member rewards",
      ],
      freeItems: [
        "Up to 3 active boards",
        "Saved and synced",
        "Unlimited completed rewards",
      ],
      plusItems: [
        "Up to 10 active boards",
        "Saved and synced",
        "Unlimited completed rewards",
      ],
      rule: "After Plus ends, every existing active board stays usable. If 5 remain, you cannot add one. Complete boards until 2 remain, then add one up to the Free limit of 3.",
    },
    ko: {
      eye: "회원 정책",
      title: "간단하게 이용해요.",
      guest: "비회원",
      free: "무료",
      plus: "Plus",
      guestItems: [
        "활성 보드 최대 3개",
        "현재 브라우저만 저장",
        "회원 보상 없음",
      ],
      freeItems: [
        "활성 보드 최대 3개",
        "계정 저장·동기화",
        "완료 보상 무제한 누적",
      ],
      plusItems: [
        "활성 보드 최대 10개",
        "계정 저장·동기화",
        "완료 보상 무제한 누적",
      ],
      rule: "Plus 종료 후에도 기존 활성 보드는 모두 이용해요. 3개 이상 남아 있으면 추가할 수 없고, 완료해서 2개가 되면 무료 한도 3개까지 1개를 추가할 수 있어요.",
    },
    zh: {
      eye: "会员规则",
      title: "保持简单。",
      guest: "访客",
      free: "免费",
      plus: "Plus",
      guestItems: ["最多3个活动面板", "仅当前浏览器", "无会员奖励"],
      freeItems: ["最多3个活动面板", "账户保存同步", "完成奖励无限累积"],
      plusItems: ["最多10个活动面板", "账户保存同步", "完成奖励无限累积"],
      rule: "Plus结束后现有面板仍可使用。剩5个时不能新增，完成到2个后可新增1个，达到免费上限3个。",
    },
    ja: {
      eye: "会員ルール",
      title: "シンプルに使えます。",
      guest: "ゲスト",
      free: "無料",
      plus: "Plus",
      guestItems: ["進行中最大3個", "このブラウザのみ", "会員報酬なし"],
      freeItems: ["進行中最大3個", "アカウント保存・同期", "完了報酬は無制限"],
      plusItems: ["進行中最大10個", "アカウント保存・同期", "完了報酬は無制限"],
      rule: "Plus終了後も既存ボードはすべて使えます。5個なら追加不可、完了して2個になれば無料上限3個まで1個追加できます。",
    },
  }[locale];
  const cards = [
    [c.guest, c.guestItems, "○"],
    [c.free, c.freeItems, "✓"],
    [c.plus, c.plusItems, "＋"],
  ] as const;
  return (
    <section className="membership-guide">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <div>
        {cards.map(([title, items, icon]) => (
          <article key={title}>
            <b>{icon}</b>
            <h3>{title}</h3>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="guest-move">↗ {c.rule}</p>
    </section>
  );
}

function MembershipGuideSimple({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "SIMPLE MEMBERSHIP",
      title: "Three active boards for everyone.",
      guest: "Guest",
      free: "Free member",
      plus: "Plus member",
      guestItems: [
        "Up to 3 active boards",
        "Browser storage only",
        "No grades, badges, or permanent plants",
      ],
      freeItems: [
        "Up to 3 active boards",
        "Account sync on every device",
        "Unlimited completed boards and rewards",
      ],
      plusItems: [
        "Up to 3 active boards",
        "Same records and rewards as Free",
        "Supports PixelLife",
      ],
      move: "Complete a board to open a new slot. Grades, badges, XP, and plants keep growing without a total limit after sign-in.",
      down: "If Plus ends while more than 3 boards are active, every existing board stays writable. You cannot create another board until fewer than 3 remain.",
    },
    ko: {
      eye: "간단한 회원 정책",
      title: "누구나 활성 보드는 3개까지.",
      guest: "비회원",
      free: "무료 회원",
      plus: "Plus 회원",
      guestItems: [
        "활성 보드 최대 3개",
        "현재 브라우저에만 저장",
        "등급·배지·영구 식물 없음",
      ],
      freeItems: [
        "활성 보드 최대 3개",
        "계정 저장·어디서나 동기화",
        "완료 보드와 보상 누적 무제한",
      ],
      plusItems: [
        "활성 보드 최대 3개",
        "무료와 같은 기록·보상",
        "PixelLife 운영 후원",
      ],
      move: "보드를 완료하면 새 슬롯이 열려요. 로그인 회원은 완료 횟수 제한 없이 XP·등급·배지·식물을 계속 쌓을 수 있어요.",
      down: "Plus 종료 시 활성 보드가 4개 이상이어도 기존 보드는 모두 계속 기록할 수 있어요. 활성 보드가 3개 미만이 되기 전까지만 새 보드 생성을 막아요.",
    },
    zh: {
      eye: "简单会员规则",
      title: "所有人最多3个活动面板。",
      guest: "访客",
      free: "免费会员",
      plus: "Plus会员",
      guestItems: ["最多3个活动面板", "仅浏览器保存", "无等级、徽章和永久植物"],
      freeItems: [
        "最多3个活动面板",
        "账户保存并随处同步",
        "完成面板和奖励无限累积",
      ],
      plusItems: ["最多3个活动面板", "记录与奖励同免费版", "支持PixelLife运营"],
      move: "完成面板后可创建新的。登录会员可无限累积XP、等级、徽章和植物。",
      down: "Plus结束时即使有4个以上活动面板，现有面板仍可全部使用；降到3个以下前不能新建。",
    },
    ja: {
      eye: "シンプルな会員ルール",
      title: "全員、進行中ボードは3個まで。",
      guest: "ゲスト",
      free: "無料会員",
      plus: "Plus会員",
      guestItems: [
        "進行中ボード最大3個",
        "ブラウザだけに保存",
        "等級・バッジ・永久植物なし",
      ],
      freeItems: [
        "進行中ボード最大3個",
        "アカウント保存・同期",
        "完了ボードと報酬は無制限",
      ],
      plusItems: [
        "進行中ボード最大3個",
        "記録・報酬は無料版と同じ",
        "PixelLifeの運営を支援",
      ],
      move: "完了すると新しい枠が開きます。ログイン会員はXP・等級・バッジ・植物を制限なく積み重ねられます。",
      down: "Plus終了時に4個以上あっても既存ボードはすべて使えます。3個未満になるまで新規作成だけできません。",
    },
  }[locale];
  const cards = [
    [c.guest, c.guestItems, "○"],
    [c.free, c.freeItems, "✓"],
    [c.plus, c.plusItems, "＋"],
  ] as const;
  return (
    <section className="membership-guide">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <div>
        {cards.map(([title, items, icon]) => (
          <article key={title}>
            <b>{icon}</b>
            <h3>{title}</h3>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="guest-move">↗ {c.move}</p>
      <p className="guest-move">↓ {c.down}</p>
    </section>
  );
}

function MembershipGuideThree({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "CHOOSE HOW TO USE IT",
      title: "Three boards are free. Sign in to keep them.",
      guest: "Guest",
      free: "Free member",
      plus: "Plus member",
      guestItems: [
        "Up to 3 active boards",
        "Saved only in this browser",
        "No grade, badges, or permanent plants",
      ],
      freeItems: [
        "Up to 3 active boards",
        "Saved to your account",
        "Use on any signed-in device",
        "Grades, badges, plants, and stats",
      ],
      plusItems: [
        "Up to 30 active boards",
        "Saved and synced anywhere",
        "All Free features",
      ],
      move: "When you sign in, up to 3 guest boards can be moved into your account after you confirm.",
      down: "After Plus ends, the 3 most recently used active boards stay writable. Extra active boards remain safe and read-only until you complete another writable board or start Plus again.",
    },
    ko: {
      eye: "이용 방법 선택",
      title: "보드 3개까지 무료로 쓰고 로그인해서 보관하세요.",
      guest: "비회원",
      free: "무료 회원",
      plus: "Plus 회원",
      guestItems: [
        "활성 보드 최대 3개",
        "현재 브라우저에만 저장",
        "등급·배지·영구 식물 없음",
      ],
      freeItems: [
        "활성 보드 최대 3개",
        "계정 DB에 계속 저장",
        "로그인하면 어디서나 확인",
        "등급·배지·식물·통계 이용",
      ],
      plusItems: [
        "활성 보드 최대 30개",
        "저장하고 어디서나 동기화",
        "무료 회원의 모든 기능",
      ],
      move: "로그인할 때 확인하면 비회원 활성 보드를 최대 3개까지 계정으로 옮길 수 있어요.",
      down: "Plus가 끝나면 최근 사용한 활성 보드 3개만 계속 수정할 수 있어요. 나머지는 삭제되지 않고 읽기 전용으로 보관되며, 사용 가능한 보드를 완료하거나 Plus를 다시 시작하면 이용할 수 있어요.",
    },
    zh: {
      eye: "选择使用方式",
      title: "免费使用3个面板，登录后保存。",
      guest: "访客",
      free: "免费会员",
      plus: "Plus会员",
      guestItems: [
        "最多3个活动面板",
        "仅保存在当前浏览器",
        "无等级、徽章和永久植物",
      ],
      freeItems: [
        "最多3个活动面板",
        "保存到账户数据库",
        "登录后随处查看",
        "使用等级、徽章、植物和统计",
      ],
      plusItems: ["最多30个活动面板", "随处保存和同步", "包含免费版全部功能"],
      move: "登录确认后，最多可将3个访客面板移入账户。",
      down: "Plus结束后，最近使用的3个活动面板可继续编辑，其余面板安全保留为只读。完成可编辑面板或重新开通Plus后可再次使用。",
    },
    ja: {
      eye: "利用方法を選択",
      title: "3ボードまで無料。ログインして保存します。",
      guest: "ゲスト",
      free: "無料会員",
      plus: "Plus会員",
      guestItems: [
        "進行中ボード最大3個",
        "現在のブラウザだけに保存",
        "等級・バッジ・永久植物なし",
      ],
      freeItems: [
        "進行中ボード最大3個",
        "アカウントDBに保存",
        "ログインすればどこでも確認",
        "等級・バッジ・植物・統計",
      ],
      plusItems: [
        "進行中ボード最大30個",
        "どこでも保存・同期",
        "無料機能すべて",
      ],
      move: "ログイン時に確認すると、ゲストボードを最大3個までアカウントへ移せます。",
      down: "Plus終了後は最近使った3個を編集でき、残りは安全な読み取り専用になります。編集可能なボードを完了するかPlusを再開すると再び利用できます。",
    },
  }[locale];
  const cards = [
    [c.guest, c.guestItems, "○"],
    [c.free, c.freeItems, "✓"],
    [c.plus, c.plusItems, "＋"],
  ] as const;
  return (
    <section className="membership-guide">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <div>
        {cards.map(([title, items, icon]) => (
          <article key={title}>
            <b>{icon}</b>
            <h3>{title}</h3>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="guest-move">↗ {c.move}</p>
      <p className="guest-move">↓ {c.down}</p>
    </section>
  );
}

function MembershipGuide({ locale }: { locale: Locale }) {
  const c = {
    en: {
      eye: "CHOOSE HOW TO USE IT",
      title: "Start free. Keep it when you sign in.",
      guest: "Guest",
      free: "Free member",
      plus: "Plus member",
      guestItems: [
        "1 active board",
        "Saved only in this browser",
        "No grade, badges, or permanent plants",
      ],
      freeItems: [
        "1 active board",
        "Saved to your account",
        "Use on any signed-in device",
        "Grades, badges, plants, and stats",
      ],
      plusItems: [
        "Up to 30 active boards",
        "Saved and synced anywhere",
        "All Free features",
      ],
      move: "When you sign in, your current guest board can be moved into your account after you confirm.",
    },
    ko: {
      eye: "이용 방법 선택",
      title: "가볍게 시작하고 로그인해서 보관하세요.",
      guest: "비회원",
      free: "무료 회원",
      plus: "Plus 회원",
      guestItems: [
        "활성 보드 1개",
        "현재 브라우저에만 저장",
        "등급·배지·영구 식물 없음",
      ],
      freeItems: [
        "활성 보드 1개",
        "계정 DB에 계속 저장",
        "로그인하면 어디서나 확인",
        "등급·배지·식물·통계 이용",
      ],
      plusItems: [
        "활성 보드 최대 30개",
        "저장하고 어디서나 동기화",
        "무료 회원의 모든 기능",
      ],
      move: "로그인할 때 확인하면 현재 비회원 보드 1개를 계정으로 옮겨 계속 사용할 수 있어요.",
    },
    zh: {
      eye: "选择使用方式",
      title: "免费开始，登录后永久保存。",
      guest: "访客",
      free: "免费会员",
      plus: "Plus会员",
      guestItems: [
        "1个活动面板",
        "仅保存在当前浏览器",
        "无等级、徽章和永久植物",
      ],
      freeItems: [
        "1个活动面板",
        "保存到账户数据库",
        "登录后随处查看",
        "使用等级、徽章、植物和统计",
      ],
      plusItems: ["最多30个活动面板", "随处保存和同步", "包含免费版全部功能"],
      move: "登录并确认后，可将当前访客面板移入账户继续使用。",
    },
    ja: {
      eye: "利用方法を選択",
      title: "無料で始め、ログインして保存します。",
      guest: "ゲスト",
      free: "無料会員",
      plus: "Plus会員",
      guestItems: [
        "進行中ボード1個",
        "現在のブラウザだけに保存",
        "等級・バッジ・永久植物なし",
      ],
      freeItems: [
        "進行中ボード1個",
        "アカウントDBに保存",
        "ログインすればどこでも確認",
        "等級・バッジ・植物・統計",
      ],
      plusItems: [
        "進行中ボード最大30個",
        "どこでも保存・同期",
        "無料機能すべて",
      ],
      move: "ログイン時に確認すると、現在のゲストボードをアカウントへ移して続けられます。",
    },
  }[locale];
  const cards = [
    [c.guest, c.guestItems, "○"],
    [c.free, c.freeItems, "✓"],
    [c.plus, c.plusItems, "＋"],
  ] as const;
  return (
    <section className="membership-guide">
      <p className="eyebrow">{c.eye}</p>
      <h2>{c.title}</h2>
      <div>
        {cards.map(([title, items, icon]) => (
          <article key={title}>
            <b>{icon}</b>
            <h3>{title}</h3>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="guest-move">↗ {c.move}</p>
    </section>
  );
}

function TestAdminPage({
  locale,
  currentUserId,
  onBack,
}: {
  locale: Locale;
  currentUserId: number;
  onBack: () => void;
}) {
  const ko = locale === "ko";
  const [users, setUsers] = useState<TestUser[]>([]);
  const [userId, setUserId] = useState(currentUserId);
  const [adminBoards, setAdminBoards] = useState<TestBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("Test board");
  const [type, setType] = useState<"LEVEL" | "CHECK" | "MOOD">("LEVEL");
  const [startDate, setStartDate] = useState(key(day(-29)));
  const [goalDays, setGoalDays] = useState(30);
  const [mode, setMode] = useState<"days" | "date" | "range">("days");
  const [days, setDays] = useState(7);
  const [singleDate, setSingleDate] = useState(today);
  const [from, setFrom] = useState(key(day(-6)));
  const [to, setTo] = useState(today);
  const loadBoards = async (id: number) => {
    const data = await pixelLifeApi.testUserBoards(id);
    setAdminBoards(data);
    setSelectedBoard((v) =>
      data.some((b) => b.id === v) ? v : data[0]?.id || 0,
    );
  };
  useEffect(() => {
    pixelLifeApi
      .testUsers()
      .then((data) => {
        setUsers(data);
        const id = data.some((u) => u.id === currentUserId)
          ? currentUserId
          : data[0]?.id;
        if (id) {
          setUserId(id);
          return loadBoards(id);
        }
      })
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Access denied"),
      );
  }, []);
  const choose = async (id: number) => {
    setUserId(id);
    setMessage("");
    try {
      await loadBoards(id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load boards");
    }
  };
  const create = async () => {
    setMessage("");
    try {
      await pixelLifeApi.testCreateBoard(userId, {
        name: name.trim(),
        type,
        startDate,
        goalDays,
      });
      await loadBoards(userId);
      setMessage(ko ? "보드를 생성했습니다." : "Board created.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create board");
    }
  };
  const fill = async () => {
    if (!selectedBoard) return;
    const query =
      mode === "days"
        ? `days=${days}`
        : mode === "date"
          ? `date=${singleDate}`
          : `from=${from}&to=${to}`;
    setMessage("");
    try {
      const data = await pixelLifeApi.testFillBoard(
        userId,
        selectedBoard,
        query,
      );
      await loadBoards(userId);
      setMessage(
        ko
          ? `${data.saved || 0}개 기록을 추가했습니다.`
          : `${data.saved || 0} records added.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add records");
    }
  };
  return (
    <main className="test-admin">
      <button className="back" onClick={onBack}>
        {ko ? "← 홈" : "← Home"}
      </button>
      <section className="test-head">
        <p className="eyebrow">ADMIN TEST</p>
        <h1>
          {ko ? "API 호출 없이 테스트하기" : "Test without direct API calls"}
        </h1>
        <p>TEST_USER_EMAILS · /#test</p>
      </section>
      {message && <p className="test-message">{message}</p>}
      <div className="test-layout">
        <aside>
          <h2>{ko ? "회원" : "Members"}</h2>
          {users.map((user) => (
            <button
              className={userId === user.id ? "active" : ""}
              key={user.id}
              onClick={() => choose(user.id)}
            >
              <b>
                #{user.id} · {user.displayName || user.email}
              </b>
              <span>{user.email}</span>
              <small>
                {user.plan} · {user.gradeCode} · {user.totalXp} XP
              </small>
            </button>
          ))}
        </aside>
        <section className="test-work">
          <h2>{ko ? "보드 목록" : "Boards"}</h2>
          <div className="test-boards">
            {adminBoards.map((board) => (
              <button
                className={selectedBoard === board.id ? "active" : ""}
                key={board.id}
                onClick={() => setSelectedBoard(board.id)}
              >
                <b>
                  #{board.id} · {board.name}
                </b>
                <span>
                  {board.type} · {board.status}
                </span>
                <small>
                  {board.startDate} ~ {board.endDate || "∞"} ·{" "}
                  {board.recordCount} records
                </small>
              </button>
            ))}
          </div>
          <div className="test-forms">
            <fieldset>
              <legend>
                {ko ? "과거 시작 보드 생성" : "Create a past board"}
              </legend>
              <label>
                {ko ? "이름" : "Name"}
                <input
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                >
                  <option>LEVEL</option>
                  <option>CHECK</option>
                  <option>MOOD</option>
                </select>
              </label>
              <label>
                {ko ? "시작일" : "Start date"}
                <input
                  type="date"
                  max={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label>
                {ko ? "목표 일수" : "Goal days"}
                <input
                  type="number"
                  min="3"
                  max="3650"
                  value={goalDays}
                  onChange={(e) => setGoalDays(Number(e.target.value))}
                />
              </label>
              <button className="primary" onClick={create}>
                {ko ? "보드 생성" : "Create board"}
              </button>
            </fieldset>
            <fieldset>
              <legend>
                {ko ? "선택 보드 기록 입력" : "Fill selected board"}
              </legend>
              <label>
                Mode
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="days">Recent days</option>
                  <option value="date">One date</option>
                  <option value="range">Date range</option>
                </select>
              </label>
              {mode === "days" && (
                <label>
                  Days
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </label>
              )}
              {mode === "date" && (
                <label>
                  Date
                  <input
                    type="date"
                    max={today}
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </label>
              )}
              {mode === "range" && (
                <>
                  <label>
                    From
                    <input
                      type="date"
                      max={today}
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      max={today}
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button
                className="primary"
                disabled={!selectedBoard}
                onClick={fill}
              >
                {ko ? "기록 추가" : "Add records"}
              </button>
            </fieldset>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
