// Presentation only. Damage, progress, rewards and question selection stay in game.js.
export function battleFeedback(battle) {
  const f = battle.feedback;
  const tier = !f?.correct ? 'quiet' : battle.won ? 'finish' : f.special ? 'special' : battle.combo >= 2 ? 'combo' : 'normal';
  const impact = { quiet: 0, normal: 160, combo: 180, special: 240, finish: 280 }[tier];
  const duration = { quiet: 0, normal: 980, combo: 1040, special: 1220, finish: 1980 }[tier];
  const variant = battle.answers % 3;
  const technique = tier === 'finish' ? 'final' : tier === 'special' ? ['cross', 'nova', 'meteor'][(Math.floor(battle.combo / 3) - 1) % 3] : 'slash';
  const title = { final: '決着の一撃！', cross: '竜撃・クロスブレイク', nova: '竜撃・スターノヴァ', meteor: '竜撃・流星ラッシュ' }[technique] || (tier === 'combo' ? '連撃！' : ['ひかりの一撃', '風切りの一撃', 'きらめく一撃'][variant]);
  return { tier, impact, duration, variant, title, technique,
    particles: tier === 'finish' ? 18 : tier === 'special' ? 14 : tier === 'combo' ? 10 : 7,
    remaining: battle.targets.length - battle.solved.length,
    pressure: battle.won ? 'won' : battle.hp === 10 ? 'last' : battle.hp / battle.maxHp <= .4 ? 'low' : 'steady',
    charge: battle.combo % 3,
  };
}
