// The supplied artwork is reused by grades; collection and progress are separate.
export const DRAGONS = [
  ['leaf', 'リーフドラゴン', '草', 1, '緑色の小さなドラゴン。葉っぱの翼で風にのり、新しい芽を見つける。'],
  ['flame', 'フレイムドラゴン', '炎', 1, '赤い体に、燃える角としっぽ。小さな炎で仲間をあたためる。'],
  ['aqua', 'アクアドラゴン', '水', 1, '青い体と魚のようなヒレと尾を持つ。水の中をすいすい泳ぐ。'],
  ['rock', 'ロックドラゴン', '岩', 2, 'ゴツゴツした岩の鎧を持つ力持ち。大きな岩も軽々と運ぶ。'],
  ['thunder', 'サンダードラゴン', '雷', 2, '黄色と黒の体。電気をまとった翼から、いなずまを放つ。'],
  ['ice', 'アイスドラゴン', '氷', 2, '水色の半透明な体と氷のツノ。歩いたあとに氷の花が咲く。'],
  ['wind', 'ウィンドドラゴン', '風', 2, '白と緑の体に鳥のような大きな翼。風を読んで空をかける。'],
  ['poison', 'ポイズンドラゴン', '毒', 3, '紫色の体に毒のトゲ。キノコの森で、ふしぎな毒の力を育てる。'],
  ['magma', 'マグマドラゴン', '火山', 3, '黒い岩肌の割れ目から溶岩が光る。大地の熱を力に変える。'],
  ['forest', 'フォレストドラゴン', '森', 3, '巨木のような角と、苔やツタに覆われた体。森の生き物を守る。'],
  ['metal', 'メタルドラゴン', '鋼', 3, '銀色の装甲を持つ重厚な竜。機械のように正確に動く。'],
  ['ghost', 'ゴーストドラゴン', '霊', 4, '半透明の体でふわりとただよう。暗闇に目だけが光る。'],
  ['crystal', 'クリスタルドラゴン', '結晶', 4, '宝石のように輝く翼。光を浴びると虹色に反射する。'],
  ['dark', 'ダークドラゴン', '闇', 4, '漆黒の体に紫の炎をまとう。巨大な翼で夜の空を飛ぶ。'],
  ['gold', 'ゴールドドラゴン', '黄金', 5, '全身が黄金に輝く竜。王冠のような角は勇気のしるし。'],
  ['ancient', 'エンシェントドラゴン', '古代', 5, '白銀の巨大竜。体に光る古代文字は、遠い昔の物語を伝える。'],
  ['volcane', 'ヴォルケインドラゴン', '炎・火山', 5, '大地の奥深くで眠っていた灼熱の竜。怒ると全身のマグマが燃え上がる。'],
  ['blizzard', 'ブリザードドラゴン', '氷・吹雪', 5, '永久氷河を守る氷の竜。翼を広げるだけで、あたりを猛吹雪に変える。'],
  ['abyss', 'アビスドラゴン', '闇・深淵', 5, '深い闇から現れる謎の竜。闇の炎をあやつり、すべての光をのみこむ。'],
  ['celestia', 'セレスティアドラゴン', '光・天空', 5, 'はるか天空に君臨する伝説の竜。すべての力を超えた、ドラゴンたちの王。'],
].map(([key, name, element, stars, lore], artIndex) => ({ key, name, element, stars, lore, artIndex }));

export const ROUTE = [0, 1, 2, 3, 16, 4, 5, 6, 7, 17, 8, 9, 10, 11, 18, 12, 13, 14, 15, 19];
export const STAGES_PER_GRADE = 20;
// 図鑑・収集・進行から独立した、まちがいノート専用の相手。
export const PHANTOM_DRAGON = {
  id: 'phantom-dragon', key: 'phantom', name: 'ファントムドラゴン', element: '幻影',
  stars: 0, lore: 'まちがえた漢字をもう一度おぼえるときだけ、紫の霊火とともに現れる特別な竜。',
  artIndex: -1, area: 0, grade: 0, stage: 0, tier: 0, kind: 'phantom', rank: '復習の幻竜',
};
export const MONSTERS = Array.from({ length: 6 }, (_, area) => ROUTE.map((artIndex, stage) => {
  const dragon = DRAGONS[artIndex], kind = artIndex === 19 ? 'final' : artIndex >= 16 ? 'boss' : 'normal';
  return { ...dragon, id: `g${area + 1}-${dragon.key}`, area, grade: area + 1, stage, tier: kind === 'final' ? 3 : kind === 'boss' ? 2 : 0, kind,
    rank: kind === 'final' ? '天空の王' : kind === 'boss' ? `中間ボス ${artIndex - 15}` : '通常ドラゴン' };
})).flat();
