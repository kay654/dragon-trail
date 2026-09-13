import { cueScore, musicScore } from './sound-score.js';

const pitch = note => 440 * 2 ** ((note - 69) / 12);
const noiseBuffers = new WeakMap();
function noiseBuffer(context) {
  if (!noiseBuffers.has(context)) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1937;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return noiseBuffers.get(context);
}

// These instruments also render offline for listening and peak verification.
export function playNote(context, destination, note, at, voices = new Set()) {
  const envelope = context.createGain(), filter = context.createBiquadFilter();
  const pan = context.createStereoPanner();
  const { voice, duration, gain } = note;
  const attack = voice === 'strings' ? .13 : voice === 'brass' ? .035 : .006;
  const end = at + duration;
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(gain, at + Math.min(attack, duration / 3));
  if (['strings', 'brass', 'flute'].includes(voice)) envelope.gain.linearRampToValueAtTime(gain * .65, at + duration * .7);
  envelope.gain.exponentialRampToValueAtTime(.0001, end);
  envelope.gain.linearRampToValueAtTime(0, end + .015);
  filter.type = voice === 'noise' ? 'bandpass' : 'lowpass';
  filter.Q.value = voice === 'noise' ? .7 : .4;
  filter.frequency.setValueAtTime(note.frequency || ({ strings: 2200, brass: 1800, bass: 650, wood: 1600, flute: 2800 }[voice] || 6500), at);
  if (note.endFrequency) filter.frequency.exponentialRampToValueAtTime(note.endFrequency, end);
  pan.pan.value = note.pan || 0;
  filter.connect(envelope); envelope.connect(pan); pan.connect(destination);
  const sources = [];
  const source = voice === 'noise' ? context.createBufferSource() : context.createOscillator();
  if (voice === 'noise') { source.buffer = noiseBuffer(context); source.loop = true; }
  else {
    source.type = ['pluck', 'strings', 'brass', 'wood'].includes(voice) ? 'triangle' : 'sine';
    source.frequency.setValueAtTime(pitch(note.note), at);
    if (note.endNote !== undefined) source.frequency.exponentialRampToValueAtTime(pitch(note.endNote), end);
  }
  sources.push(source);
  if (['bell', 'metal', 'strings', 'brass', 'flute'].includes(voice)) {
    const overtone = context.createOscillator(), partial = context.createGain();
    overtone.type = voice === 'strings' || voice === 'brass' ? 'triangle' : 'sine';
    overtone.frequency.value = pitch(note.note) * (voice === 'metal' ? 2.76 : voice === 'strings' ? 1 : 2);
    overtone.detune.value = voice === 'strings' ? 7 : 0;
    partial.gain.value = voice === 'strings' ? .3 : .16;
    overtone.connect(partial); partial.connect(filter);
    sources.push(overtone);
    overtone.onended = () => { overtone.disconnect(); partial.disconnect(); };
  }
  source.connect(filter);
  const handle = { stop(time) { for (const oscillator of sources) { try { oscillator.stop(time); } catch { /* Already ended. */ } } } };
  voices.add(handle);
  source.onended = () => { voices.delete(handle); source.disconnect(); filter.disconnect(); envelope.disconnect(); pan.disconnect(); };
  for (const oscillator of sources) { oscillator.start(at); oscillator.stop(end + .02); }
  return handle;
}

function fade(param, value, now, seconds = .12) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else { const current = param.value; param.cancelScheduledValues(now); param.setValueAtTime(current, now); }
  param.linearRampToValueAtTime(value, now + seconds);
}

export function createAudio({ createContext = () => {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Audio ? new Audio() : null;
}, every = setInterval, cancel = clearInterval } = {}) {
  let context, master, effects, music, duck, song, tick, resumePending;
  let allowed = false, settings = { sound: false, music: false, soundVolume: .7, musicVolume: .45, scene: null, paused: false };
  let currentScene = null, nextEvent = 0, loopStart = 0, duckUntil = 0, epoch = 0;
  const effectVoices = new Set(), musicVoices = new Set();

  function init() {
    if (context) return true;
    context = createContext();
    if (!context) return false;
    master = context.createGain(); master.gain.value = .7;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12; compressor.knee.value = 14; compressor.ratio.value = 5;
    compressor.attack.value = .003; compressor.release.value = .2;
    master.connect(compressor); compressor.connect(context.destination);
    effects = context.createGain(); music = context.createGain(); duck = context.createGain();
    effects.connect(master); music.connect(duck); duck.connect(master);
    effects.gain.value = 0; music.gain.value = 0;
    const room = context.createConvolver(), wet = context.createGain();
    const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * .75), context.sampleRate);
    const noise = noiseBuffer(context).getChannelData(0);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = noise[(i + ch * 7919) % noise.length] * (1 - i / data.length) ** 3 * .25;
    }
    room.buffer = impulse; wet.gain.value = .13;
    effects.connect(room); duck.connect(room); room.connect(wet); wet.connect(master);
    context.onstatechange = () => {
      if (context.state === 'running') reconcile();
      else { stopMusic(); stopEffects(); }
    };
    return true;
  }
  function stopEffects() {
    if (!context) return;
    for (const voice of effectVoices) voice.stop(context.currentTime + .025);
    effectVoices.clear(); duckUntil = 0;
    fade(duck.gain, 1, context.currentTime, .025);
  }
  function stopMusic() {
    if (tick !== undefined) { cancel(tick); tick = undefined; }
    if (context) {
      fade(music.gain, 0, context.currentTime, .12);
      for (const voice of musicVoices) voice.stop(context.currentTime + .13);
    }
    musicVoices.clear(); currentScene = null; song = null;
  }
  function schedule() {
    if (!song || context.state !== 'running') return;
    const now = context.currentTime;
    // A throttled tab must never dump a backlog of notes into the speakers.
    if (loopStart + song.events[nextEvent].at < now - .2) { loopStart = now + .04; nextEvent = 0; }
    while (loopStart + song.events[nextEvent].at < now + .16) {
      const note = song.events[nextEvent];
      playNote(context, music, note, loopStart + note.at, musicVoices);
      if (++nextEvent === song.events.length) { nextEvent = 0; loopStart += song.duration; }
    }
  }
  function reconcile() {
    if (!context) return;
    const now = context.currentTime;
    fade(master.gain, !settings.paused && (settings.sound || settings.music) ? .7 : 0, now, .08);
    fade(effects.gain, settings.sound && !settings.paused ? settings.soundVolume : 0, now, .025);
    if (!settings.sound || settings.paused) stopEffects();
    const scene = !settings.paused && settings.music && context.state === 'running' ? settings.scene : null;
    if (scene !== currentScene) {
      stopMusic();
      song = musicScore(scene);
      if (song) {
        currentScene = scene; nextEvent = 0; loopStart = now + .16;
        fade(music.gain, settings.musicVolume * .65, now + .14, .45);
        schedule(); tick = every(schedule, 40);
      }
    } else if (scene) fade(music.gain, settings.musicVolume * .65, now, .15);
  }
  function unlock() {
    if ((!settings.sound && !settings.music) || settings.paused) return;
    try {
      allowed = true;
      if (!init()) return;
      if (context.state === 'suspended' || context.state === 'interrupted') {
        if (!resumePending) resumePending = context.resume().then(reconcile).catch(() => {}).finally(() => { resumePending = null; });
      } else reconcile();
    } catch { /* Device audio failure must not interrupt the game. */ }
  }
  function configure(options) {
    const previous = settings;
    settings = { ...settings, ...options };
    if (previous.scene !== settings.scene || settings.paused || !settings.sound) epoch++;
    for (const key of ['soundVolume', 'musicVolume']) settings[key] = Number.isFinite(settings[key]) ? Math.max(0, Math.min(1, settings[key])) : .5;
    try {
      if (context && previous.scene !== settings.scene) { fade(effects.gain, 0, context.currentTime, .02); stopEffects(); }
      if (allowed && (settings.sound || settings.music) && !settings.paused) unlock();
      else reconcile();
    } catch { /* Audio remains optional. */ }
  }
  function sound(event, options) {
    if (!settings.sound || settings.paused || !allowed) return;
    if (resumePending && context?.state !== 'running') {
      const requestedAt = epoch;
      resumePending.then(() => { if (requestedAt === epoch && context?.state === 'running') sound(event, options); });
      return;
    }
    try {
      if (!context || context.state !== 'running') return;
      const notes = cueScore(event, options);
      if (!notes.length) return;
      if (effectVoices.size > 48) stopEffects();
      const now = context.currentTime + .008;
      for (const note of notes) playNote(context, effects, note, now + note.at, effectVoices);
      if (event !== 'tap') {
        const duration = Math.max(...notes.map(n => n.at + n.duration));
        duckUntil = Math.max(duckUntil, now + duration);
        fade(duck.gain, .38, now, .025);
        duck.gain.setValueAtTime(.38, duckUntil);
        duck.gain.linearRampToValueAtTime(1, duckUntil + .4);
      }
    } catch { /* Unsupported audio never prevents answering. */ }
  }
  function dispose() {
    epoch++;
    stopMusic(); stopEffects();
    if (context) { context.onstatechange = null; context.close().catch(() => {}); }
    context = null; allowed = false;
  }
  return { configure, unlock, sound, dispose };
}
export const audio = createAudio();
