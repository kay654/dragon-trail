import { freshProfile, readProfile, createRound, nextQuestion, answerQuestion, finishRound, ROUND_SIZE } from '../shared/engine.js';
import { MONSTERS, PHANTOM_DRAGON, STAGES_PER_GRADE } from './dragons.js';
export { MONSTERS, PHANTOM_DRAGON, STAGES_PER_GRADE } from './dragons.js';
export const SAVE_KEY = 'kanji-dragon-trail:v1';
export const ATTACK_DAMAGE = 10;
export const AREAS = [
  { name: '風わたる草原', short: '草原', element: '風', color: '#4a8670', light: '#acd8b0', sky: '#c5e3df' },
  { name: 'ひかりの岩山', short: '岩山', element: '地', color: '#b58040', light: '#ebc777', sky: '#e7dcc0' },
  { name: 'しずくの海岸', short: '海岸', element: '水', color: '#338aab', light: '#91d8e6', sky: '#c9e8ef' },
  { name: 'こもれびの遺跡', short: '遺跡', element: '森', color: '#588849', light: '#c7d795', sky: '#d3dfc1' },
  { name: '星ふる雪原', short: '雪原', element: '氷', color: '#787fad', light: '#ccd6ee', sky: '#dfe6f1' },
  { name: 'あかつきの火山', short: '火山', element: '火', color: '#bf6854', light: '#f1b67b', sky: '#efd7c5' },
];
const bounded = (v, max = 1e9) => Number.isSafeInteger(v) && v >= 0 && v <= max;
export const monsterById = id => id === PHANTOM_DRAGON.id ? PHANTOM_DRAGON : MONSTERS.find(m => m.id === id);
export function freshGame(profile = freshProfile()) {
  return { version: 3, profile, catches: {}, clears: [0,0,0,0,0,0], best: 0, combo: 0, active: null };
}
export function encounter(game, grade = game.profile.grade) {
  const list = MONSTERS.filter(m => m.grade === grade);
  return list.find(m => !game.catches[m.id]) || list[game.clears[grade - 1] % STAGES_PER_GRADE];
}
export function gradeProgress(game, questions, grade = game.profile.grade) {
  const pool = questions.filter(q => q.grade === grade);
  const mastered = pool.filter(q => game.profile.records[q.id]?.correct > 0).length;
  return { total:pool.length, mastered, remaining:pool.length-mastered, complete:pool.length>0 && mastered===pool.length };
}
export function stageQuestions(questions, m) {
  const pool = questions.filter(q => q.grade === m.grade);
  const weights = MONSTERS.filter(x => x.grade === m.grade).map(x => x.kind === 'normal' ? 2 : 3);
  const total = weights.reduce((a,b)=>a+b,0), before = weights.slice(0,m.stage).reduce((a,b)=>a+b,0);
  return pool.slice(Math.floor(pool.length*before/total), Math.floor(pool.length*(before+weights[m.stage])/total));
}
export function stageProgress(game, questions, m = encounter(game)) {
  const pool = m.kind === 'final' ? questions.filter(q => q.grade === m.grade) : stageQuestions(questions,m);
  const mastered = pool.filter(q => game.profile.records[q.id]?.correct > 0).length;
  return { total:pool.length, mastered, remaining:pool.length-mastered };
}
export const weakQuestions = (game,questions) => questions.filter(q=>q.grade===game.profile.grade && game.profile.records[q.id]?.wrong>0 && game.profile.records[q.id].streak<2);
export function mistakeHistory(game,questions,grade=game.profile.grade) {
  return questions.filter(q=>q.grade===grade && game.profile.records[q.id]?.wrong>0)
    .map(q=>({...q,...game.profile.records[q.id]})).sort((a,b)=>b.wrong-a.wrong || a.id.localeCompare(b.id));
}
export function battleTargets(game, questions, m, practice=false) {
  if(practice) return mistakeHistory(game,questions,m.grade).filter(q=>q.streak<2).slice(0,5).map(q=>q.id);
  const pool = m.kind==='final' ? questions.filter(q=>q.grade===m.grade) : stageQuestions(questions,m);
  const remaining = pool.filter(q=>!game.profile.records[q.id]?.correct);
  // Replays use a short challenge; first visits cover each still-unanswered word.
  return (remaining.length ? remaining : pool.slice(0,m.kind==='normal'?3:5)).map(q=>q.id);
}
function learningQuestion(game) {
  const b=game.active, full=b.round.pool;
  b.round.pool=full.filter(q=>b.targets.includes(q.id) && !b.solved.includes(q.id));
  nextQuestion(b.round,game.profile);
  b.round.pool=full;
}
function registerCatch(game,m) {
  game.catches[m.id]=(game.catches[m.id]||0)+1; game.clears[m.area]++;
}
export function syncFinalRewards(game,questions) {
  const unlocked=[];
  for(const m of MONSTERS.filter(x=>x.kind==='final')) {
    if(!game.catches[m.id] && gradeProgress(game,questions,m.grade).complete) {
      registerCatch(game,m); unlocked.push(m.id);
    }
  }
  return unlocked;
}
export function startBattle(game,questions,practice=false) {
  if(game.active) return game.active;
  syncFinalRewards(game,questions);
  const m=practice ? { ...PHANTOM_DRAGON, grade: game.profile.grade, area: game.profile.grade - 1 } : encounter(game);
  const targets=battleTargets(game,questions,m,practice);
  if(!targets.length) return null;
  const round=createRound(questions,game.profile.grade,practice?'practice':'journey');
  game.active={monsterId:m.id,targets,solved:[],maxHp:targets.length*ATTACK_DAMAGE,hp:targets.length*ATTACK_DAMAGE,
    startCombo:game.combo,combo:game.combo,best:game.combo,correct:0,answers:0,round,feedback:null,won:false,newCatch:false,missed:[],unlocked:[]};
  learningQuestion(game); return game.active;
}
export function strike(game,choice) {
  const b=game.active;
  if(!b || b.won || b.solved.includes(b.round.current?.id)) return null;
  const answer=answerQuestion(b.round,game.profile,choice);
  if(!answer) return null;
  const hpBefore=b.hp;
  b.answers++; b.combo=answer.correct?b.combo+1:0; game.combo=b.combo;
  b.best=Math.max(b.best,b.combo); game.best=Math.max(game.best,b.best);
  if(answer.correct) { b.correct++; b.solved.push(b.round.current.id); b.hp-=ATTACK_DAMAGE; }
  else if(!b.missed.includes(b.round.current.id)) b.missed.push(b.round.current.id);
  // HP is exactly ten times the remaining targets. No hidden shield, bonus
  // damage, overkill display, or independent completion gate.
  b.won=b.hp===0;
  b.feedback={...answer,choice,damage:hpBefore-b.hp,hpBefore,finisher:b.won,special:answer.correct && b.combo%3===0};
  if(b.won && b.round.mode!=='practice') {
    const m=monsterById(b.monsterId); b.newCatch=!game.catches[m.id]; registerCatch(game,m);
  }
  b.unlocked.push(...syncFinalRewards(game,b.round.pool));
  if(b.round.index===ROUND_SIZE) finishRound(b.round,game.profile);
  return b.feedback;
}
export function advanceBattle(game) {
  const b=game.active;
  if(!b || b.won || !b.round.locked) return false;
  if(b.round.index===ROUND_SIZE) b.round=createRound(b.round.pool,b.round.grade,b.round.mode);
  learningQuestion(game); b.feedback=null; return true;
}
export function claimReward(game) {
  if(!game.active?.won) return false;
  game.active=null; return true;
}
export function saveGame(storage,game) {
  try {
    const active=game.active?{...game.active,round:{...game.active.round,pool:undefined,current:game.active.round.current.id}}:null;
    storage.setItem(SAVE_KEY,JSON.stringify({...game,active})); return true;
  } catch { return false; }
}
export function resetGame(storage) {
  const game=freshGame(); return saveGame(storage,game)?{ok:true,game}:{ok:false,game:null};
}
function restoreBattle(raw,questions) {
  if(!raw) return null;
  const r=raw.round, found=monsterById(raw.monsterId);
  const m=found?.key==='phantom' ? { ...found, grade:r?.grade, area:(r?.grade ?? 1)-1 } : found;
  if(!m||!r||r.grade!==m.grade) throw Error('battle');
  const round=createRound(questions,r.grade,r.mode==='practice'?'practice':'journey');
  if(m.key==='phantom' && round.mode!=='practice') throw Error('phantom');
  const validIds=new Set(round.pool.map(q=>q.id));
  for(const name of ['targets','solved','missed']) {
    if(!Array.isArray(raw[name]) || raw[name].some(id=>!validIds.has(id)) || new Set(raw[name]).size!==raw[name].length) throw Error(name);
  }
  if(!raw.targets.length || raw.solved.some(id=>!raw.targets.includes(id))) throw Error('targets');
  if(round.mode==='practice' && raw.targets.length>5) throw Error('practice');
  if(round.mode!=='practice' && m.kind!=='final' && raw.targets.some(id=>!stageQuestions(questions,m).some(q=>q.id===id))) throw Error('assignment');
  if(raw.maxHp!==raw.targets.length*ATTACK_DAMAGE || raw.hp!==(raw.targets.length-raw.solved.length)*ATTACK_DAMAGE || raw.won!==(raw.hp===0)) throw Error('hp');
  for(const key of ['combo','best','correct','answers','startCombo']) if(!bounded(raw[key])) throw Error(key);
  if(raw.correct!==raw.solved.length || raw.correct>raw.answers || raw.combo>raw.best || raw.best>raw.correct+raw.startCombo) throw Error('counts');
  const current=round.pool.find(q=>q.id===r.current);
  if(!current || !raw.targets.includes(current.id) || !bounded(r.index,ROUND_SIZE) || typeof r.locked!=='boolean' || !Array.isArray(r.answers) || r.answers.length!==r.index || (r.index===ROUND_SIZE&&!r.locked)) throw Error('round');
  if(!Array.isArray(r.options)||r.options.length!==4||new Set(r.options).size!==4||r.options.some(c=>![current.answer,...current.distractors].includes(c))) throw Error('options');
  for(const a of r.answers) {
    const q=round.pool.find(q=>q.id===a.id);
    if(!q||!raw.targets.includes(q.id)||![q.answer,...q.distractors].includes(a.choice)||a.correct!==(a.choice===q.answer)) throw Error('answers');
  }
  let combo=0,best=0;
  for(const a of r.answers){combo=a.correct?combo+1:0;best=Math.max(best,combo);}
  Object.assign(round,{current,options:r.options,index:r.index,locked:r.locked,answers:r.answers,correct:r.answers.filter(a=>a.correct).length,combo,best,finished:r.index===ROUND_SIZE});
  let feedback=null;
  if(r.locked) {
    const a=r.answers.at(-1), f=raw.feedback;
    if(!a||a.id!==current.id||!f||f.correct!==a.correct||f.damage!==(a.correct?ATTACK_DAMAGE:0)||f.hpBefore!==raw.hp+f.damage||raw.solved.includes(current.id)!==a.correct) throw Error('feedback');
    feedback={correct:a.correct,answer:current.answer,choice:a.choice,damage:f.damage,hpBefore:f.hpBefore,finisher:raw.won,special:a.correct&&raw.combo%3===0,retry:f.retry===true};
  } else if(raw.won||raw.solved.includes(current.id)) throw Error('unanswered');
  return {...raw,round,feedback,unlocked:Array.isArray(raw.unlocked)?[...new Set(raw.unlocked.filter(id=>monsterById(id)?.kind==='final'))]:[]};
}
export function loadGame(storage,questions) {
  const game=freshGame();
  try {
    const json=storage.getItem(SAVE_KEY);
    if(!json) {game.profile=readProfile(storage).profile;syncFinalRewards(game,questions);return {game,recovered:false};}
    const raw=JSON.parse(json);
    if(![1,2,3].includes(raw?.version)) throw Error('version');
    game.profile=readProfile({getItem:()=>JSON.stringify(raw.profile)}).profile;
    game.best=bounded(raw.best)?raw.best:0; game.combo=bounded(raw.combo,game.best)?raw.combo:0;
    if(raw.version===1) game.legacy={catches:raw.catches||{},clears:raw.clears||[]};
    else {
      if(raw.legacy) game.legacy=raw.legacy;
      game.clears=game.clears.map((_,i)=>bounded(raw.clears?.[i])?raw.clears[i]:0);
      for(const m of MONSTERS) if(bounded(raw.catches?.[m.id])&&raw.catches[m.id]) game.catches[m.id]=raw.catches[m.id];
    }
    for(const m of MONSTERS.filter(x=>x.kind==='final')) if(!gradeProgress(game,questions,m.grade).complete) delete game.catches[m.id];
    syncFinalRewards(game,questions);
    // v2's in-progress HP used a different rule. Preserve all learning and
    // collections, then start its next battle under the new consistent rule.
    if(raw.version!==3) return {game,recovered:false,migrated:true};
    const active=restoreBattle(raw.active,questions);
    if(active?.won && active.round.mode!=='practice' && stageProgress(game,questions,monsterById(active.monsterId)).remaining) throw Error('unearned reward');
    game.active=active;
    if(active){game.profile.grade=active.round.grade;game.combo=active.combo;}
    return {game,recovered:false};
  } catch {return {game,recovered:true};}
}
