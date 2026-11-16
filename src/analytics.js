export const APP_NAME = "kanji_dragon_trail";
const levelParameters = {
  level_name: (value) => ["normal", "boss", "final", "practice"].includes(value),
  content_grade: (value) => Number.isInteger(value) && value >= 1 && value <= 6
};
const analyticsEvents = {
  app_use: { usage_action: (value) => value === "start" || value === "resume" },
  level_start: levelParameters,
  level_end: { ...levelParameters, success: (value) => value === true },
  unlock_achievement: {
    content_grade: levelParameters.content_grade,
    achievement_id: (value) => ["dragon_collection", "grade_completion"].includes(value)
  },
};
let analyticsUsed = false;

export function track(name, parameters = {}, send) {
  try {
    if (!Object.prototype.hasOwnProperty.call(analyticsEvents, name)) return false;
    const gtag = send ?? globalThis.gtag;
    if (typeof gtag !== "function") return false;
    const allowed = {};
    for (const [key, valid] of Object.entries(analyticsEvents[name])) {
      if (valid(parameters[key])) allowed[key] = parameters[key];
    }
    gtag("event", name, {
      ...allowed, app_name: APP_NAME, app_key: APP_NAME, content_group: APP_NAME
    });
    return true;
  } catch {
    // Analytics must not interrupt the game.
    return false;
  }
}

export function markUsed(action) {
  if (analyticsUsed) return;
  analyticsUsed = true;
  track("app_use", { usage_action: action });
}
