// 패 표기(예: 3456m234p067s88p9s, 0 = 적5, 1z~7z = 東南西北白發中)를 패 목록으로 바꿉니다.
const SUITS = { m: '萬', p: '筒', s: '索' };
const HONORS = ['東', '南', '西', '北', '白', '發', '中'];

export const TILE_PATTERN = /^(?:[0-9]+[mpsz])+$/;

export function parseTiles(str = '') {
  const out = [];
  let buf = [];
  for (const c of String(str).replace(/\s+/g, '')) {
    if ('mpsz'.includes(c)) {
      for (const d of buf) out.push(makeTile(d, c));
      buf = [];
    } else if (/[0-9]/.test(c)) {
      buf.push(c);
    }
  }
  return out;
}

function makeTile(d, s) {
  if (s === 'z') {
    const i = Number(d) - 1;
    const tone = d === '7' ? 'red' : d === '6' ? 'green' : 'ink';
    return { face: HONORS[i] ?? '?', suit: '', tone };
  }
  const red = d === '0';
  const tone = red ? 'red' : s === 'p' ? 'blue' : s === 's' ? 'green' : 'ink';
  return { face: red ? '5' : d, suit: SUITS[s], tone, red };
}
