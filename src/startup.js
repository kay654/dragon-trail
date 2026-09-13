import { validateQuestions } from './engine.js';

export class StartupError extends Error {
  constructor(stage, message, cause) {
    super(message, { cause });
    this.name = 'StartupError';
    this.stage = stage;
  }
}

// Independent, validated snapshot: it also works before SW installation finishes.
// This cache contains no player progress and survives app-cache version cleanup.
export async function loadQuestions({
  url = new URL('../data/questions.json', import.meta.url),
  fetcher = globalThis.fetch,
  cacheStorage = globalThis.caches,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  timeoutMs = 5000,
} = {}) {
  url = new URL(url);
  const cacheName = `kanji-dragon-trail-question-data-${encodeURIComponent(new URL('../', url).pathname)}-v1`;
  async function backup() {
    try {
      const response = await (await cacheStorage.open(cacheName)).match(url.href);
      if (response) return validateQuestions(await response.json());
    } catch { /* Missing/invalid backups must never replace valid questions. */ }
    return null;
  }
  async function remember(questions) {
    try {
      const cache = await cacheStorage.open(cacheName);
      await cache.put(url.href, new Response(JSON.stringify(questions), { headers: { 'Content-Type': 'application/json' } }));
    } catch { /* A denied or full cache does not prevent online play. */ }
  }
  async function request(attempt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response;
      try { response = await fetcher(url.href, { signal: controller.signal, cache: attempt ? 'reload' : 'default' }); }
      catch (cause) { throw new StartupError('network', controller.signal.aborted ? 'Question request timed out' : 'Question request failed', cause); }
      if (!response.ok) throw new StartupError('network', `Question request returned HTTP ${response.status}`);
      try { return validateQuestions(await response.json()); }
      catch (cause) {
        throw new StartupError(controller.signal.aborted ? 'network' : 'data', 'Question response could not be read or validated', cause);
      }
    } finally { clearTimeout(timeout); }
  }

  let failure;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const questions = await request(attempt);
      await remember(questions);
      return { questions, fromBackup: false };
    } catch (error) {
      failure = error;
      if (error.stage === 'network') {
        const questions = await backup();
        if (questions) return { questions, fromBackup: true };
      }
      if (!attempt) await wait(300);
    }
  }
  const questions = await backup();
  if (questions) return { questions, fromBackup: true };
  throw failure;
}
