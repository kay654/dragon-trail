export const ROUND_SIZE = 10;
export const STORAGE_KEY = "kotoba-islands:v1";
export const ISLANDS = [
  "はじまりの森",
  "風車の丘",
  "ひみつの泉",
  "星あかりの庭",
  "雲のとしょかん",
  "虹のむこう",
];
export function freshProfile() {
  return {
    version: 1,
    grade: 1,
    sound: false,
    auto: true,
    totalCorrect: 0,
    totalAnswers: 0,
    bestCombo: 0,
    plays: 0,
    stars: 0,
    records: {},
    discoveries: [],
    gradePlays: [0, 0, 0, 0, 0, 0],
  };
}
const count = (v) => (Number.isSafeInteger(v) && v >= 0 && v <= 1e9 ? v : 0);
export function readProfile(storage) {
  const base = freshProfile();
  try {
    const p = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!p || p.version !== 1) return { profile: base, recovered: !!p };
    base.grade = [1, 2, 3, 4, 5, 6].includes(p.grade) ? p.grade : 1;
    base.sound = p.sound === true;
    base.auto = p.auto !== false;
    for (const k of [
      "totalCorrect",
      "totalAnswers",
      "bestCombo",
      "plays",
      "stars",
    ])
      base[k] = count(p[k]);
    base.bestCombo = Math.min(ROUND_SIZE, base.bestCombo);
    base.gradePlays = base.gradePlays.map((_, i) => count(p.gradePlays?.[i]));
    base.discoveries = Array.isArray(p.discoveries)
      ? [
          ...new Set(
            p.discoveries.filter(
              (x) => typeof x === "string" && /^[a-z0-9-]{1,30}$/.test(x),
            ),
          ),
        ].slice(0, 10000)
      : [];
    if (
      p.records &&
      typeof p.records === "object" &&
      !Array.isArray(p.records)
    ) {
      for (const [id, r] of Object.entries(p.records).slice(0, 10000)) {
        if (!/^[a-z0-9-]{1,30}$/.test(id) || !r || typeof r !== "object")
          continue;
        base.records[id] = {
          correct: count(r.correct),
          wrong: count(r.wrong),
          streak: count(r.streak),
          due: count(r.due),
          seen: count(r.seen),
        };
      }
    }
    return { profile: base, recovered: false };
  } catch {
    return { profile: base, recovered: true };
  }
}
export function saveProfile(storage, profile) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function validateQuestions(data) {
  if (!Array.isArray(data) || !data.length) throw new Error("問題がありません");
  const ids = new Set();
  for (const q of data) {
    if (
      !q ||
      !/^[a-z0-9-]+$/.test(q.id) ||
      ids.has(q.id) ||
      ![1, 2, 3, 4, 5, 6].includes(q.grade) ||
      typeof q.word !== "string" ||
      !Number.isInteger(q.blank) ||
      [...q.word][q.blank] !== q.answer ||
      [...q.answer].length !== 1 ||
      !Array.isArray(q.distractors) ||
      q.distractors.length !== 3 ||
      new Set([q.answer, ...q.distractors]).size !== 4 ||
      q.distractors.some((c) => typeof c !== "string" || [...c].length !== 1) ||
      !q.reading ||
      !q.hint
    )
      throw new Error(`問題データを確認してください: ${q?.id}`);
    ids.add(q.id);
  }
  return data;
}
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function createRound(questions, grade, mode = "journey") {
  const pool = questions.filter((q) => q.grade === grade);
  if (!pool.length)
    throw new Error("この学年の問題は、まだ準備中です。ほかの学年で遊んでね。");
  return {
    pool,
    grade,
    mode,
    index: 0,
    correct: 0,
    combo: 0,
    best: 0,
    answers: [],
    current: null,
    options: [],
    locked: false,
    finished: false,
  };
}
export function nextQuestion(round, profile, random = Math.random) {
  if (round.index >= ROUND_SIZE) return null;
  const recent = round.answers.slice(-2).map((a) => a.id);
  let pool = round.pool.filter((q) => !recent.includes(q.id));
  if (!pool.length) pool = round.pool.filter((q) => q.id !== round.current?.id);
  if (!pool.length) pool = round.pool;
  const due = pool.filter((q) => {
    const r = profile.records[q.id];
    return r && r.wrong > 0 && r.streak < 2 && r.due <= profile.totalAnswers;
  });
  const unseen = pool.filter((q) => !round.answers.some((a) => a.id === q.id));
  const candidates = due.length ? due : unseen.length ? unseen : pool;
  const weights = candidates.map((q) => {
    const r = profile.records[q.id];
    return (
      1 +
      (r?.wrong && r.streak < 2 ? (round.mode === "practice" ? 10 : 4) : 0) +
      (!r ? 2 : 0)
    );
  });
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  let pick = candidates.at(-1);
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      pick = candidates[i];
      break;
    }
  }
  round.current = pick;
  round.options = shuffle([pick.answer, ...pick.distractors], random);
  round.locked = false;
  return pick;
}
export function answerQuestion(round, profile, choice) {
  if (
    round.locked ||
    round.finished ||
    !round.current ||
    !round.options.includes(choice)
  )
    return null;
  round.locked = true;
  const q = round.current,
    correct = choice === q.answer;
  round.index++;
  round.correct += Number(correct);
  round.combo = correct ? round.combo + 1 : 0;
  round.best = Math.max(round.best, round.combo);
  round.answers.push({ id: q.id, correct, choice });
  profile.totalAnswers++;
  profile.totalCorrect += Number(correct);
  profile.bestCombo = Math.max(profile.bestCombo, round.best);
  const r = profile.records[q.id] || {
    correct: 0,
    wrong: 0,
    streak: 0,
    due: 0,
    seen: 0,
  };
  const retry = correct && r.wrong > 0 && r.streak < 2;
  r.seen++;
  r.correct += Number(correct);
  r.wrong += Number(!correct);
  r.streak = correct ? r.streak + 1 : 0;
  r.due = profile.totalAnswers + (correct ? (r.streak >= 2 ? 30 : 4) : 2);
  profile.records[q.id] = r;
  if (correct && !profile.discoveries.includes(q.id))
    profile.discoveries.push(q.id);
  return { correct, answer: q.answer, combo: round.combo, retry };
}
export function finishRound(round, profile) {
  if (round.finished || round.index !== ROUND_SIZE) return null;
  round.finished = true;
  const stars =
    1 + Number(round.correct >= 7) + Number(round.correct === ROUND_SIZE);
  profile.plays++;
  profile.gradePlays[round.grade - 1]++;
  profile.stars += stars;
  return {
    stars,
    island: Math.min(5, Math.floor(profile.stars / 6)),
    correct: round.correct,
    best: round.best,
  };
}
