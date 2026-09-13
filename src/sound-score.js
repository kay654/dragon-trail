// Original Dragon Trail score. Times in seconds, pitches in MIDI notes.
// Shared by the live player and the offline audio review renderer.
const tone = (at, note, duration, gain = .12, voice = 'bell', pan = 0) => ({ at, note, duration, gain, voice, pan });
const noise = (at, duration, gain, frequency, endFrequency, pan = 0) => ({ at, duration, gain, frequency, endFrequency, voice: 'noise', pan });
const sweep = (at, note, endNote, duration, gain, voice = 'sine') => ({ ...tone(at, note, duration, gain, voice), endNote });
const arpeggio = (notes, at = 0, step = .09, gain = .1) => notes.map((note, i) => tone(at + i * step, note, .42, gain, 'bell', (i % 3 - 1) * .3));
function attack(power = 1) {
  return [noise(0, .16, .18, 900, 6500, -.35), noise(.09, .16, .22 * power, 2300, 380, .25),
    sweep(.085, 48, 29, .22, .26 * power), tone(.105, 74, .14, .065, 'metal')];
}
export function cueScore(event, { combo = 0 } = {}) {
  switch (event) {
    case 'tap': return [tone(0, 79, .075, .075, 'pluck')];
    case 'start': return arpeggio([62, 69, 74], 0, .1, .105);
    case 'correct': return [...attack(), ...arpeggio([81, 86], .16, .075, .07)];
    case 'retry': return [...attack(), ...arpeggio([74, 78, 81, 86], .15, .085, .075)];
    case 'combo': return [...attack(1.1), ...arpeggio(combo >= 6 ? [81, 86, 90, 93] : [78, 81, 86], .15, .065, .09)];
    case 'special': return [...attack(1.2), noise(.2, .24, .14, 1200, 7500, .5), ...arpeggio([74, 81, 86, 90, 93], .18, .07, .105)];
    // Gentle wooden notes: no alarm or punishing buzzer.
    case 'wrong': return [tone(0, 67, .2, .12, 'wood'), tone(.17, 62, .3, .09, 'wood')];
    // Slash impact, dissolving shimmer, then the victory seal at ~1.1 s.
    case 'finish': return [...attack(1.35), noise(.2, .8, .16, 2200, 6500),
      ...arpeggio([62, 69, 74, 78, 81, 86], .35, .1, .08),
      ...[50, 62, 66, 69, 74].map(n => tone(1.08, n, .9, .08, 'brass'))];
    case 'boss': return [sweep(0, 38, 26, .9, .3), noise(0, .9, .2, 500, 2300),
      ...[38, 45, 50].map(n => tone(.15, n, 1.15, .105, 'brass')),
      ...[38, 45, 53].map(n => tone(.85, n, .85, .09, 'brass'))];
    case 'final': return [sweep(0, 38, 26, 1.1, .25), noise(.05, 1, .12, 1000, 6500),
      ...[50, 57, 62, 66, 69].map(n => tone(.18, n, 1.45, .085, 'brass')),
      ...arpeggio([74, 81, 86, 90, 93], .5, .14, .09)];
    case 'clear': return [...arpeggio([74, 78, 81, 86], .05, .14, .14),
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
  battle: { bpm: 112, roots: [50, 58, 53, 48, 50, 58, 55, 57],
    melody: [[74,0,77,81,0,77,74,72],[74,0,77,82,0,81,77,0],[77,0,81,84,0,81,79,77],[79,0,76,72,0,76,79,0],
      [81,0,86,84,81,0,77,74],[77,0,82,81,77,0,74,0],[79,0,82,86,0,82,79,77],[76,0,73,76,81,0,73,0]] },
  boss: { bpm: 120, roots: [38, 38, 46, 48, 38, 46, 43, 45],
    melody: [[74,0,74,77,0,76,74,0],[69,0,74,0,77,76,74,0],[70,0,74,77,0,82,81,77],[72,0,76,79,0,76,72,0],
      [81,0,77,74,81,0,86,0],[82,0,81,77,74,0,77,0],[79,0,82,79,74,0,70,0],[73,0,76,81,0,76,73,0]] },
  final: { bpm: 108, roots: [50, 58, 53, 48, 55, 58, 50, 57],
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
    chord.forEach((n, i) => events.push(tone(at, n, step * 7.8, .027, 'strings', (i - 1) * .45)));
    for (let beat = 0; beat < 8; beat++) {
      const t = at + beat * step;
      if (beat % 2 === 0) events.push(tone(t, root + (beat === 4 ? 7 : 0), step * 1.6, .10, 'bass'));
      if (driving || beat % 2 === 0) events.push(tone(t, chord[[0,1,2,1,0,2,1,2][beat]] + 12, step * 1.4, .035, 'pluck', beat % 2 ? .35 : -.35));
      let note = s.melody[bar % 8][beat];
      if (note) {
        if (bar >= 8 && scene !== 'final') note -= 12;
        events.push(tone(t, note, step * (beat % 2 === 0 ? 1.7 : .85), driving ? .065 : .055, driving ? 'flute' : 'bell', -.12));
        if (scene === 'final' && bar >= 8 && beat % 2 === 0) events.push(tone(t + step * .5, note - 12, step * 2, .035, 'bell', .4));
      }
      if (driving) {
        if (beat === 0 || beat === 4 || (scene === 'boss' && beat === 7)) events.push(sweep(t, 43, 27, .19, .15));
        if (beat === 2 || beat === 6) events.push(noise(t, .11, .065, 1400, 750), tone(t, 50, .1, .04, 'wood'));
        events.push(noise(t, .035, beat % 2 ? .018 : .025, 6500, 4500, .25));
      }
    }
  }
  return { events: events.sort((a, b) => a.at - b.at), duration: 16 * 8 * step, bpm: s.bpm };
}
