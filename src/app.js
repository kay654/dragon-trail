import { battleScreen, rewardScreen } from './play-screens.js';
import { homeScreen, bookAreaScreen, historyScreen, settingsScreen, requirement } from './screens.js';
import { loadQuestions } from './startup.js';
import { audio } from './sound.js';
import { AREAS, MONSTERS, monsterById, loadGame, saveGame, startBattle, strike, advanceBattle, claimReward, resetGame } from './game.js';
import { icon, emblem, monster } from './art.js';

const app = document.querySelector('#app');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let game, questions, view = 'home', timer, saveFailed = false, notice = '', selectedMonster = null, historyGrade = 1, historyFilter = 'all';
let initializing = false, startupFailed = false, registrationAttempt;
const serviceWorker = (() => { try { return navigator.serviceWorker; } catch { return null; } })();
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { throw Error(); }, setItem() { throw Error(); } }; }
const total = () => Object.values(game.catches).reduce((a, b) => a + b, 0);
const caught = () => Object.keys(game.catches).length;
const currentMonster = () => monsterById(game.active.monsterId);
function persist() { saveFailed = !saveGame(storage, game); }
function announce(text) { const el = document.querySelector('#live'); if (el) el.textContent = text; }
function syncAudio() {
  if (!game) return;
  const b = game.active;
  const scene = view === 'battle' && b ? b.won ? null : b.round.mode === 'practice' ? 'practice' : currentMonster().kind === 'normal' ? 'battle' : currentMonster().kind : view === 'reward' ? 'reward' : 'home';
  const dialog = document.querySelector('dialog[open]');
  const { sound, music, soundVolume, musicVolume } = game.profile;
  audio.configure({ sound, music, soundVolume, musicVolume, scene, paused: document.hidden || !!(dialog && !dialog.querySelector('#sound-setting')) });
  const toggle = document.querySelector('[data-action="sound"]');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(sound || music));
    toggle.setAttribute('aria-label', `音を${sound || music ? 'オフ' : 'オン'}にする`);
    toggle.innerHTML = `${icon(sound || music ? 'sound' : 'mute')}<span>音</span>`;
  }
}
function header() {
 return '<header class="header"><button class="brand" data-action="home" aria-label="ホーム">'+emblem()+'<span>漢字竜の探検隊</span></button><nav aria-label="メニュー"><button data-action="sound" aria-label="音を'+(game.profile.sound || game.profile.music ? 'オフ' : 'オン')+'にする" aria-pressed="'+!!(game.profile.sound || game.profile.music)+'">'+icon(game.profile.sound || game.profile.music ? 'sound' : 'mute')+'<span>音</span></button><button data-action="book">'+icon('book')+'<span>図鑑</span></button><button data-action="history">'+icon('flag')+'<span>ノート</span></button><button data-action="help">'+icon('settings')+'<span>設定</span></button></nav></header>';
}
function render(focus = false, animate = false) {
  app.dataset.view = view;
  app.innerHTML = `${header()}<main id="main">${view === 'home' ? home() : view === 'battle' ? battleScreen(game, questions, animate) : view === 'reward' ? rewardScreen(game, questions, animate) : view === 'history' ? historyScreen(game, questions, historyGrade, historyFilter) : book()}</main><footer><span>漢字竜の探検隊</span><span>記録は自動保存</span></footer><p class="notice" role="status">${saveFailed ? 'この端末に保存できません。今は遊べますが、閉じると記録が消えます。' : esc(notice)}</p><div class="sr-only" id="live" role="status" aria-live="polite"></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
  if (focus) document.querySelector('[data-focus]')?.focus({ preventScroll: true });
  syncAudio();
}
function grades() {
  return `<div class="grades" role="group" aria-label="問題の学年">${AREAS.map((a, i) => `<button data-grade="${i + 1}" class="${game.profile.grade === i + 1 ? 'selected' : ''}" aria-pressed="${game.profile.grade === i + 1}" ${game.active ? 'disabled' : ''}><b>${i + 1}<small>年</small></b><span>${a.short}</span></button>`).join('')}</div>`;
}
function home() { return homeScreen(game, questions, grades()); }
function book() {
  return `<section class="book-shell"><div class="section-head"><div><p class="eyebrow"></p><h1 tabindex="-1" data-focus>ドラゴン図鑑</h1><p>学年ごとに20体。影の竜を仲間にしよう。</p></div><button class="quiet" data-action="home">${icon('back')}拠点へ</button></div><div class="book-progress"><strong>${caught()}<small> / 120 体</small></strong><div class="book-meter"><i style="width:${caught() / 120 * 100}%"></i></div><span>${caught() === 120 ? '全学年コンプリート！ 探検マスター' : 'まだ見ぬ世界へ'}</span></div><div class="book-tabs" role="tablist" aria-label="図鑑のエリア">${AREAS.map((a, i) => `<button role="tab" aria-selected="${(selectedMonster ?? game.profile.grade - 1) === i}" data-book-area="${i}">${i + 1}年<span>${a.short}</span></button>`).join('')}</div>${bookArea(selectedMonster ?? game.profile.grade - 1)}<div class="book-records"><span>総討伐数 <b>${total()}</b></span><span>最高コンボ <b>${game.best}</b></span><span>といた問題 <b>${game.profile.totalAnswers}</b></span></div></section>`;
}
function bookArea(index) { return bookAreaScreen(game, questions, index); }
function showDialog(content) {
  clearTimeout(timer);
  const dialog = document.querySelector('#dialog');
  dialog.innerHTML = content;
  dialog.showModal();
  syncAudio();
  dialog.querySelector('button, input')?.focus();
}
const closeButton = '<button class="primary wide" data-action="close-dialog">とじる</button>';
function go(target, animate = true) { clearTimeout(timer); view = target; render(true, animate); window.scrollTo({ top: 0, behavior: 'instant' }); }
function rewardSound() { audio.sound(game.active.unlocked.length ? 'legend' : game.active.round.mode === 'practice' ? 'practice-clear' : 'clear'); }
function begin(practice = false) {
  const active = startBattle(game, questions, practice);
  if (!active) { notice = '復習する問題はクリア済みです。'; go('home'); return; }
  persist();
  go(active.won ? 'reward' : 'battle', active.won || !active.answers);
  if (active.won) rewardSound();
  else if (!active.answers) audio.sound(active.round.mode === 'practice' || currentMonster().kind === 'normal' ? 'start' : currentMonster().kind);
}
function next() {
  clearTimeout(timer);
  if (view !== 'battle' || !game.active?.feedback) return;
  if (game.active.won) { go('reward'); rewardSound(); }
  else { advanceBattle(game); persist(); render(true); }
}
function answer(choice) {
  if (view !== 'battle' || document.querySelector('dialog[open]')) return;
  const feedback = strike(game, choice);
  if (!feedback) return;
  persist();
  render(false, true);
  audio.sound(feedback.correct ? game.active.won ? 'finish' : feedback.special ? 'special' : feedback.retry ? 'retry' : game.active.combo >= 2 ? 'combo' : 'correct' : 'wrong', { combo: game.active.combo });
  announce(feedback.correct ? `${feedback.damage}ダメージ。${game.active.won ? '討伐成功！' : `残りHP ${game.active.hp}`}` : `答えは${game.active.round.current.word}。${game.active.round.current.reading}`);
  if (feedback.correct && game.profile.auto) timer = setTimeout(next, game.active.won ? 2200 : feedback.special ? 1300 : 1100);
  else document.querySelector('.next-answer')?.focus({ preventScroll: true });
}
app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || !game) return;
  audio.unlock();
  if (!button.dataset.choice && !['start', 'practice', 'again', 'next', 'sound'].includes(button.dataset.action)) audio.sound('tap');
  if (button.dataset.historyGrade) { historyGrade = Number(button.dataset.historyGrade); render(); return; }
  if (button.dataset.historyFilter) { historyFilter = button.dataset.historyFilter; render(); return; }
  if (button.dataset.reviewGrade && !game.active) { game.profile.grade = Number(button.dataset.reviewGrade); begin(true); return; }
  if (button.dataset.choice) return answer(button.dataset.choice);
  if (button.dataset.grade && !game.active) { game.profile.grade = Number(button.dataset.grade); persist(); render(); return; }
  if (button.dataset.bookArea !== undefined) { selectedMonster = Number(button.dataset.bookArea); render(); document.querySelector(`[data-book-area="${selectedMonster}"]`)?.focus(); return; }
  if (button.dataset.monster) {
    const m = monsterById(button.dataset.monster), found = game.catches[m.id];
    showDialog(`<p class="eyebrow">NO. ${String(MONSTERS.indexOf(m) + 1).padStart(3, '0')} / ${m.rank}</p><h2 id="dialog-title">${found ? m.name : 'まだ見ぬドラゴン'}</h2><div class="dialog-monster">${monster(m, { silhouette: !found })}</div><p>${found ? m.lore : requirement(game, questions, m)}</p><p>${found ? `${m.element}属性 / ${'★'.repeat(m.stars)} / ${found}回クリア` : '出会ってたおすと、名前と姿が図鑑にのこる。'}</p>${closeButton}`); return;
  }
  switch (button.dataset.action) {
    case 'start': begin(); break;
    case 'practice': begin(true); break;
    case 'next': next(); break;
    case 'again': claimReward(game); begin(); break;
    case 'finish': claimReward(game); persist(); go('home'); break;
    case 'reward-book': claimReward(game); persist(); selectedMonster = null; go('book'); break;
    case 'home': go('home'); break;
    case 'book': selectedMonster = null; go('book'); break;
    case 'sound': {
      const enabled = !(game.profile.sound || game.profile.music);
      game.profile.sound = enabled; game.profile.music = enabled;
      persist(); render(); audio.unlock(); audio.sound('tap'); break;
    }
    case 'pause': showDialog(`<h2 id="dialog-title">ひとやすみ</h2><p>バトルはここで待っているよ。<br>途中の問題から再開できるよ。</p><button class="primary wide" data-action="close-dialog">バトルにもどる ${icon('arrow')}</button><button class="quiet wide" data-action="home">保存して拠点へ</button>`); break;
    case 'stow':
      if (game.active.won) { claimReward(game); persist(); render(); break; }
      showDialog(`<h2 id="dialog-title">探検をしまう？</h2><p>途中のバトルを閉じるよ。図鑑と、正解した問題の記録はのこるよ。</p><button class="primary wide" data-action="close-dialog">つづける</button><button class="quiet wide" data-action="abandon">しまって学年をえらぶ</button>`); break;
    case 'abandon': game.active = null; persist(); go('home'); break;
    case 'close-dialog': document.querySelector('#dialog').close(); break;
    case 'history': historyGrade = game.profile.grade; historyFilter = 'all'; go('history'); break;
    case 'help': showDialog(settingsScreen(game)); break;
    case 'reset-confirm':
      showDialog('<h2 id="dialog-title">すべての記録を消しますか？</h2><p>1〜6年の図鑑、正解・まちがいの回数、最高コンボ、途中の冒険、旧バージョンの記録、音などの設定を初期化します。消した記録は元にもどせません。</p><button class="primary wide" data-action="close-dialog">やめる・記録をのこす</button><button class="danger wide" data-action="reset-all">すべて消して、はじめから</button>'); break;
    case 'reset-all': {
      const result = resetGame(storage);
      if (!result.ok) { showDialog('<h2 id="dialog-title">データを消せませんでした</h2><p>端末への保存に失敗しました。記録は変更していません。ブラウザーの保存設定を確認して、もう一度お試しください。</p>' + closeButton); break; }
      clearTimeout(timer); game = result.game; saveFailed = false; selectedMonster = null; historyGrade = 1; historyFilter = 'all'; notice = 'すべてのゲームデータをクリアしました。'; go('home'); break;
    }
  }
});
app.addEventListener('close', () => syncAudio(), true);
app.addEventListener('change', event => {
  const key = { 'auto-setting': 'auto', 'sound-setting': 'sound', 'music-setting': 'music' }[event.target.id];
  if (key) {
    game.profile[key] = event.target.checked; persist(); syncAudio(); audio.unlock();
    if (key === 'sound') audio.sound('correct');
  }
});
app.addEventListener('input', event => {
  const key = { 'sound-volume': 'soundVolume', 'music-volume': 'musicVolume' }[event.target.id];
  if (!key) return;
  game.profile[key] = Number(event.target.value) / 100;
  document.querySelector(`[data-volume="${key}"]`).textContent = `${event.target.value}%`;
  persist(); syncAudio(); audio.unlock();
});
app.addEventListener('change', event => { if (event.target.id === 'sound-volume') audio.sound('correct'); });
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || document.querySelector('dialog[open]')) return;
  if (view === 'battle' && /^[1-4]$/.test(event.key)) { event.preventDefault(); audio.unlock(); answer(game.active.round.options[Number(event.key) - 1]); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); if (game) persist(); } syncAudio(); });
window.addEventListener('pagehide', () => { audio.configure({ paused: true }); if (game) persist(); });
window.addEventListener('pageshow', () => syncAudio());
async function init() {
  if (initializing) return;
  initializing = true;
  const retry = document.querySelector('#retry-load');
  if (retry) { retry.disabled = true; retry.textContent = '準備しています…'; }
  registerServiceWorker();
  let stage = 'network';
  try {
    const result = await loadQuestions();
    questions = result.questions;
    notice = result.fromBackup ? '保存してある問題で再開しました。' : '';
    stage = 'restore';
    const loaded = loadGame(storage, questions); game = loaded.game;
    if (loaded.migrated) notice = '学習記録を引き継ぎました。新しいルールで冒険を再開できます。';
    if (loaded.recovered) notice = '保存の一部を読みこめませんでした。読みこめた記録から再開します。';
    persist();
    stage = 'render';
    render();
    startupFailed = false;
    delete app.dataset.startupError;
    warmOfflineAssets();
    document.fonts?.load('600 48px "Klee One"').catch(() => {});
  } catch (error) {
    startupFailed = true;
    stage = error.stage || stage;
    app.dataset.startupError = stage;
    console.error(`[Dragon Trail startup: ${stage}]`, error);
    const message = stage === 'network' ? '通信が戻ったら、自動でもう一度ためすよ。' : stage === 'data' ? '問題データを読みこめませんでした。もう一度ためしてね。' : '画面をひらけませんでした。もう一度ためしてね。';
    app.innerHTML = `<main class="load-error"><h1>探検の準備ができませんでした</h1><p>${message}</p><button class="primary" id="retry-load">もう一度読みこむ</button></main>`;
    document.querySelector('#retry-load').onclick = init;
  } finally { initializing = false; }
}
function warmOfflineAssets() {
  try { serviceWorker?.controller?.postMessage({ type: 'CACHE_OPTIONAL' }); }
  catch (error) { console.warn('[Dragon Trail optional assets]', error); }
}
function registerServiceWorker() {
  if (!serviceWorker || registrationAttempt) return;
  const script = new URL('../sw.js', import.meta.url);
  const scope = new URL('../', import.meta.url);
  registrationAttempt = Promise.resolve().then(() => serviceWorker.register(script.href, { scope: scope.href, updateViaCache: 'none' }))
    .then(registration => { registration.active?.postMessage({ type: 'CACHE_OPTIONAL' }); })
    .catch(error => console.warn('[Dragon Trail offline setup]', error))
    .finally(() => { registrationAttempt = undefined; });
}
function recoverStartup() {
  if (startupFailed && !document.hidden && navigator.onLine !== false) init();
}
serviceWorker?.addEventListener('controllerchange', warmOfflineAssets);
window.addEventListener('online', () => { registerServiceWorker(); warmOfflineAssets(); recoverStartup(); });
window.addEventListener('pageshow', recoverStartup);
document.addEventListener('visibilitychange', recoverStartup);
init();
