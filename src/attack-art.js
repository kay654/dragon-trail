// Small, bounded CSS scenes. No timers, canvas loop or gameplay mutations.
export function attackArt(fx, combo) {
  const heavy = fx.tier === 'special' || fx.tier === 'finish';
  return `<div class="impact-backdrop"></div><div class="answer-callout">${fx.tier === 'finish' ? 'きめろ！' : fx.tier === 'special' ? '必殺！' : 'ナイス！'}</div>
    <div class="speed-tunnel"></div><div class="impact-star"></div><div class="blast-wave"></div>
    ${heavy ? `<div class="ultimate-beam"></div><div class="meteor-trails">${[0,1,2].map(i=>`<i style="--i:${i}"></i>`).join('')}</div><div class="impact-shards">${Array.from({length:6},(_,i)=>`<i style="--i:${i};--angle:${i*60+20}deg"></i>`).join('')}</div>` : ''}
    ${combo >= 2 && fx.tier !== 'finish' ? `<div class="combo-burst"><b>${combo}</b><span>れんぞく！</span></div>` : ''}
    ${fx.tier === 'finish' ? '<div class="finisher-sun"></div>' : ''}`;
}

export function celebrationArt() {
  return `<div class="reward-confetti" aria-hidden="true">${Array.from({length:22},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%;--drift:${(i%2?1:-1)*(15+i%5*12)}px;--delay:${i%6*45}ms;--confetti:${['#f4b735','#65c9b2','#ec866b','#fff3b3'][i%4]}"></i>`).join('')}</div>`;
}
