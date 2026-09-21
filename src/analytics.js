// Keep application identity separate from event names so this property can be
// shared with other applications without making event reports app-specific.
export const APP_NAME = 'kanji_dragon_trail';

export function track(eventName, parameters = {}, send = globalThis.gtag) {
  if (typeof send !== 'function') return false;
  try {
    send('event', eventName, { app_name: APP_NAME, ...parameters });
    return true;
  } catch {
    // Analytics must never prevent a child from playing when the tag is blocked.
    return false;
  }
}
