// These reviewed replacements also migrate choices in an unfinished saved round.
// Question IDs, answers and learning records remain unchanged.
const replacements = {
  'g4-153': { '宓': '忘' },
  'g5-123': { '佁': '位' },
  'g6-129': { '葳': '蔽' },
  'g6-157': { '偝': '肺' },
  'g6-179': { '宓': '察' },
};
export function updatedChoice(question, choice) {
  const replacement = replacements[question?.id]?.[choice];
  return replacement && question.distractors.includes(replacement) ? replacement : choice;
}
export function questionChoices(question) {
  const choices = [question.answer, ...(Array.isArray(question.distractors) ? question.distractors : [])];
  if (choices.length !== 4 || choices.some(c => typeof c !== 'string' || !/^\p{Unified_Ideograph}$/u.test(c)) ||
      new Set(choices.map(c => c.normalize('NFKC'))).size !== 4) {
    throw new Error(`選択肢が不正または重複しています: ${question.id}`);
  }
  return choices;
}
