import { AREAS } from './game.js';
export function icon(name) {
  const paths = {
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    crown: '<path d="m3 6 4 5 5-7 5 7 4-5-2 13H5Z"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    book: '<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
    sound: '<path d="m4 9 4 0 5-4v14l-5-4H4Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    mute: '<path d="m4 9 4 0 5-4v14l-5-4H4Zm13 0 5 6m0-6-5 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    spark: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
    leaf: '<path d="M20 3C10 2 3 7 4 14c1 6 8 7 12 2 3-4 3-9 4-13Z" fill="currentColor" stroke="none"/><path d="M3 21 15 9" stroke="#477c41"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    flag: '<path d="M5 22V3m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    cross: '<path d="m6 6 12 12M6 18 18 6"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}
export function emblem() {
  const source = new URL('../assets/emblem.svg', import.meta.url).href;
  return `<img class="brand-emblem" src="${source}" width="40" height="40" alt="" aria-hidden="true" draggable="false">`;
}
export function monster(m, { silhouette = false, compact = false } = {}) {
  if (m.key === 'phantom') {
    const source = new URL('../assets/dragons/phantom.png', import.meta.url).href;
    return '<img class="monster dragon-sprite phantom-sprite '+(silhouette?'silhouette':'')+' '+(compact?'compact':'')+'" src="'+source+'" alt="'+(silhouette?'未獲得のドラゴン':m.name)+'" draggable="false" decoding="async">';
  }
  const boss=m.artIndex>=16, index=boss?m.artIndex-16:m.artIndex;
  const source=new URL('../assets/dragons/'+(boss?'boss':'normal')+'/'+String(index+1).padStart(2,'0')+'.png',import.meta.url).href;
  return '<img class="monster dragon-sprite '+(silhouette?'silhouette':'')+' '+(compact?'compact':'')+'" src="'+source+'" alt="'+(silhouette?'未獲得のドラゴン':m.name)+'" draggable="false" decoding="async">';
}
export function landscape(area = 0) {
  const a = AREAS[area];
  return `<svg class="landscape" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path fill="${a.sky}" d="M0 0h1200v600H0Z"/><circle cx="913" cy="133" r="63" fill="#fff2cb"/>
    <g fill="#fffdf0" opacity=".5"><path d="M89 117h206l-44-12-19-20-42 4-20 22ZM679 70h166l-19-13-39 0-29-19-30 28ZM963 208h199l-41-17-35 2-15-22-42 18Z"/></g>
    <path d="m0 363 151-185 151 186 139-244 195 245 110-145 150 147 150-181 154 147v267H0" fill="${a.color}" opacity=".23"/>
    <path d="m320 330 121-210 79 152-70-33-28 26-17-35Z" fill="${a.light}" opacity=".5"/>
    <path d="M0 371q180-83 338 11t406-33 456 15v236H0" fill="${a.color}" opacity=".46"/>
    <path d="M0 440q170-53 354 5t391-40 455 26v169H0" fill="${a.color}"/>
    <path d="M603 390q-210 52-90 106t-81 104h310q33-43-137-108t41-102" fill="${a.light}" opacity=".65"/>
    <g fill="#244d48" opacity=".6"><path d="M40 454v-89h15v-37h47v126h19v-91h42v114H0v-23M980 413v-99h22v-42h63v153h24v-61h30v75Z"/><path d="M987 313h73v19h-73m20 26h21v26h-21"/></g>
    <g fill="#163e43"><path d="M0 600V487l64 38-22-105 64 91-7-64 42 85 14-36 13 61 90 43ZM1200 600V466l-56 61 14-91-41 69-18-47-19 79-42-18 15 54-92 27Z"/></g>
    ${area === 2 ? '<path d="M0 461q230-30 470 18t730-9v47q-350-21-638-9T0 494Z" fill="#a8e4e7" opacity=".6"/>' : ''}
    ${area === 4 ? '<g fill="#fff"><circle cx="740" cy="91" r="3"/><circle cx="580" cy="139" r="3"/><circle cx="1030" cy="80" r="3"/><path d="m950 70 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/></g>' : ''}
  </svg>`;
}
