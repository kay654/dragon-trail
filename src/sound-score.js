// Original Dragon Trail score. Times in seconds, pitches in MIDI notes.
// Shared by the live player and the offline audio review renderer.
const tone = (at, note, duration, gain = .12, voice = 'bell', pan = 0) => ({ at, note, duration, gain, voice, pan });
const noise = (at, duration, gain, frequency, endFrequency, pan = 0) => ({ at, duration, gain, frequency, endFrequency, voice: 'noise', pan });
const sweep = (at, note, endNote, duration, gain, voice = 'sine') => ({ ...tone(at, note, duration, gain, voice), endNote });
const arpeggio = (notes, at = 0, step = .09, gain = .1) => notes.map((note, i) => tone(at + i * step, note, .42, gain, 'bell', (i % 3 - 1) * .3));
function attack(power = 1, impact = .16) {
  return [
    // A rising wind-up leaves the answer audible immediately; the blade lands at impact.
    noise(.012, Math.max(.07, impact - .012), .16 * power, 1100, 5800, -.5),
    tone(0, 86, .055, .04, 'bell'),
    { ...noise(impact - .022, .105, .3 * power, 6800, 1250, -.3), voice: 'slash' },
    { ...noise(impact, .075, .24 * power, 4500, 850, .3), voice: 'crack' },
    sweep(impact, 52, 31, .19, .24 * power, 'kick'),
    tone(impact + .012, 45, .12, .07 * power, 'bass'),
    tone(impact + .035, 81, .13, .045, 'metal'),
  ];
}
function powerAccent(impact, combo = 3) {
  const technique = (Math.floor(combo / 3) - 1) % 3;
  const charge = [sweep(.025, 57, 86, Math.max(.1, impact - .025), .1, 'lead'),
    sweep(impact, 62, 29, .3, .15, 'kick'), tone(impact + .02, 38, .32, .1, 'bass')];
  if (technique === 0) return [...charge,
    { ...noise(impact + .075, .12, .2, 6200, 1100, .55), voice: 'slash' },
    tone(impact + .12, 81, .25, .065, 'metal')];
  if (technique === 1) return [...charge,
    sweep(impact + .03, 67, 91, .35, .11, 'lead'),
    ...[74, 81, 86].map((n, i) => tone(impact + .09 + i * .045, n, .3, .055, 'bell', (i - 1) * .5))];
  return [...charge,
    ...[0, 1, 2].flatMap(i => [
      { ...noise(impact + .055 + i * .075, .075, .13, 6000, 1200, (i - 1) * .5), voice: 'slash' },
      sweep(impact + .075 + i * .075, 49, 31, .12, .08, 'kick'),
    ])];
}
export function cueScore(event, { combo = 0, impactAt } = {}) {
  const impact = impactAt ?? (event === 'finish' ? .28 : event === 'special' ? .24 : event === 'combo' ? .18 : .16);
  switch (event) {
    case 'tap': return [tone(0, 79, .075, .075, 'pluck')];
    case 'start': return arpeggio([62, 69, 74], 0, .1, .105);
    case 'correct': return [...attack(1, impact), tone(impact + .11, 86, .21, .045, 'bell')];
    case 'retry': return [...attack(1, impact), ...arpeggio([78, 81, 86], impact + .1, .07, .055)];
    case 'combo': return [...attack(1.12, impact), ...arpeggio(combo >= 6 ? [81, 86, 90] : [78, 81, 86], impact + .09, .06, .065)];
    case 'special': return [...attack(1.22, impact), ...powerAccent(impact, combo || 3), ...arpeggio([74, 81, 86, 90], impact + .17, .06, .065)];
    // Gentle wooden notes: no alarm or punishing buzzer.
    case 'wrong': return [tone(0, 67, .2, .12, 'wood'), tone(.17, 62, .3, .09, 'wood')];
    // Immediate answer bell, final impact, then the victory seal at .98 s.
    case 'finish': return [...attack(1.32, impact), ...powerAccent(impact, 6), noise(impact + .07, .45, .11, 2200, 6500),
      ...arpeggio([62, 69, 74, 78, 81, 86], impact + .12, .085, .08),
      ...[50, 62, 66, 69, 74].map(n => tone(.98, n, .75, .08, 'brass'))];
    case 'boss': return [sweep(0, 43, 27, .55, .25, 'kick'), noise(0, .62, .13, 650, 2400),
      ...[38, 45, 50].map(n => tone(.12, n, .75, .085, 'brass')),
      { ...noise(.42, .11, .09, 3200, 1100), voice: 'snare' },
      sweep(.72, 48, 28, .18, .16, 'kick'),
      ...[38, 45, 53].map(n => tone(.78, n, .6, .075, 'brass'))];
    case 'final': return [sweep(0, 43, 26, .65, .26, 'kick'), noise(.04, .75, .12, 900, 5600),
      ...[50, 57, 62, 66, 69].map(n => tone(.16, n, 1.1, .075, 'brass')),
      { ...noise(.52, .13, .1, 3000, 1000), voice: 'snare' },
      ...arpeggio([74, 81, 86, 90, 93], .46, .115, .075)];
    case 'clear': return [sweep(.04, 45, 31, .14, .11, 'kick'), ...arpeggio([74, 78, 81, 86], .05, .12, .12),
      ...[62,66,69,74].map(n=>tone(.32,n,.65,.045,'brass')),
      ...[50, 62, 66, 69].map(n => tone(.48, n, 1.3, .07, 'strings')), tone(.72, 93, 1.2, .09, 'bell')];
    case 'practice-clear': return arpeggio([74, 78, 81, 86], .05, .13, .1);
    case 'legend': return [...arpeggio([74, 81, 86, 90, 93, 98], .25, .16, .09),
      ...[50, 57, 66, 74].map(n => tone(.5, n, 1.7, .07, 'strings'))];
    default: return [];
  }
}
// Eight-bar melodies with an answering phrase on the second pass (16 bars).
// A common D tonal centre keeps the transition cues consonant with the score.
const scores = {
  home: { bpm: 84, roots: [50, 55, 59, 57, 50, 55, 52, 57], major: true,
    melody: [[74,0,78,81,0,78,76,0],[74,0,71,0,69,0,0,0],[71,74,78,0,81,0,78,0],[76,0,73,0,69,0,0,0],
      [74,0,78,81,86,0,81,0],[83,0,81,79,78,0,74,0],[76,0,79,0,78,76,74,0],[73,0,76,0,69,0,0,0]] },
  practice: { bpm: 92, roots: [50, 55, 50, 57, 59, 55, 52, 57], major: true,
    melody: [[74,0,78,0,81,0,78,0],[79,0,78,0,74,0,0,0],[78,0,81,0,86,0,81,0],[76,0,73,0,69,0,0,0],
      [78,0,74,0,71,0,74,0],[79,0,78,0,74,0,0,0],[76,0,79,0,83,0,79,0],[81,0,76,0,73,0,0,0]] },
  battle: { bpm: 124, roots: [50, 58, 53, 48, 50, 58, 55, 57],
    melody: [[74,0,77,81,0,77,74,72],[74,0,77,82,0,81,77,0],[77,0,81,84,0,81,79,77],[79,0,76,72,0,76,79,0],
      [81,0,86,84,81,0,77,74],[77,0,82,81,77,0,74,0],[79,0,82,86,0,82,79,77],[76,0,73,76,81,0,73,0]] },
  boss: { bpm: 146, roots: [38, 38, 46, 48, 38, 46, 43, 45],
    melody: [[74,0,74,77,0,76,74,0],[69,0,74,0,77,76,74,0],[70,0,74,77,0,82,81,77],[72,0,76,79,0,76,72,0],
      [81,0,77,74,81,0,86,0],[82,0,81,77,74,0,77,0],[79,0,82,79,74,0,70,0],[73,0,76,81,0,76,73,0]] },
  final: { bpm: 138, roots: [50, 58, 53, 48, 55, 58, 50, 57],
    melody: [[86,0,0,81,84,0,81,77],[82,0,0,77,81,0,77,74],[81,0,84,0,89,0,88,84],[84,0,0,79,76,0,79,0],
      [86,0,82,0,79,0,82,86],[89,0,86,82,81,0,77,0],[86,0,81,77,74,0,77,81],[85,0,81,76,73,0,0,0]] },
  reward: { bpm: 88, roots: [50, 55, 59, 57, 50, 55, 52, 57], major: true,
    melody: [[86,0,81,0,78,0,0,0],[79,0,83,0,81,0,0,0],[78,0,81,0,86,0,0,0],[85,0,81,0,76,0,0,0],
      [86,0,90,0,93,0,90,0],[91,0,86,0,83,0,0,0],[88,0,83,0,79,0,0,0],[85,0,81,0,0,0,0,0]] },
};
export const MUSIC_SCENES = Object.keys(scores);
export const CUE_NAMES = ['tap', 'start', 'correct', 'retry', 'combo', 'special', 'wrong', 'finish', 'boss', 'final', 'clear', 'practice-clear', 'legend'];
export function musicScore(scene) {
  const s = scores[scene];
  if (!s) return null;
  const step = 30 / s.bpm, events = [];
  const driving = ['battle', 'boss', 'final'].includes(scene);
  for (let bar = 0; bar < 16; bar++) {
    const root = s.roots[bar % 8], at = bar * step * 8;
    const minor = s.major ? [59, 52].includes(root) : [38, 50, 43, 55].includes(root);
    const chord = [root + 12, root + (minor ? 15 : 16), root + 19];
    chord.forEach((n, i) => events.push(tone(at, n, step * 7.8, driving ? .019 : .027, 'strings', (i - 1) * .45)));
    for (let beat = 0; beat < 8; beat++) {
      const t = at + beat * step;
      if (beat % 2 === 0 || (driving && beat === 7)) events.push(tone(t, root + (beat === 4 ? 7 : 0), step * (driving ? .85 : 1.6), driving ? .105 : .10, 'bass'));
      if (driving || beat % 2 === 0) events.push(tone(t, chord[[0,1,2,1,0,2,1,2][beat]] + 12, step * (driving ? .65 : 1.4), driving ? .048 : .035, driving ? 'lead' : 'pluck', beat % 2 ? .35 : -.35));
      let note = s.melody[bar % 8][beat];
      if (note) {
        if (bar >= 8 && scene !== 'final') note -= 12;
        events.push(tone(t, note, step * (beat % 2 === 0 ? 1.25 : .72), driving ? .072 : .055, driving ? 'lead' : 'bell', -.12));
        if (scene === 'final' && bar >= 8 && beat % 2 === 0) events.push(tone(t + step * .5, note - 12, step * 2, .035, 'bell', .4));
      }
      if (driving) {
        if (beat === 0 || beat === 4 || (scene !== 'battle' && beat === 7)) events.push(sweep(t, 48, 28, .15, scene === 'boss' ? .18 : .14, 'kick'));
        if (beat === 2 || beat === 6) events.push({ ...noise(t, .095, scene === 'boss' ? .105 : .085, 2800, 1200), voice: 'snare' });
        events.push({ ...noise(t, .03, beat % 2 ? .025 : .038, 7500, 5200, .25), voice: 'hat' });
        if ((scene === 'boss' || scene === 'final') && beat === 7 && bar % 4 === 3)
          events.push({ ...noise(t + step * .5, .045, .065, 6500, 3500, -.3), voice: 'snare' });
      }
    }
  }
  return { events: events.sort((a, b) => a.at - b.at), duration: 16 * 8 * step, bpm: s.bpm };
}
