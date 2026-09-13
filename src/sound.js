// Replace these short synthesized cues with audio assets without touching game state.
let context;
export function sound(event, enabled) {
  if (!enabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context ||= new Audio();
    if (context.state === "suspended") context.resume().catch(() => {});
    const notes = {
      boss: [130, 146, 174, 220],
      finish: [196, 392, 587, 784],
      tap: [440],
      correct: [660, 880],
      retry: [523, 659, 784],
      wrong: [330, 392],
      combo: [659, 784, 1047],
      clear: [523, 659, 784, 1047],
    }[event] || [440];
    notes.forEach((frequency, i) => {
      const osc = context.createOscillator(),
        gain = context.createGain(),
        at = context.currentTime + i * 0.075;
      osc.type = event === "boss" ? "triangle" : "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.055, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(at);
      osc.stop(at + 0.17);
    });
  } catch {
    /* Sound is optional, including when browser audio is unavailable. */
  }
}
