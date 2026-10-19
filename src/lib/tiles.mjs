// 패 표기(예: 3456m234p067s88p9s, 0 = 적5, 1z~7z = 東南西北白發中)를 패 목록으로 바꿉니다.
// 패 그림은 public/tiles/{code}.svg 에 있습니다 (scripts/gen-tiles.mjs 로 만듦).
const SUITS = { m: '만', p: '통', s: '삭' };
const HONORS = ['동', '남', '서', '북', '백', '발', '중'];

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

export function tileSrc(t) {
  return `/tiles/${t.code}.svg`;
}

function makeTile(d, s) {
  if (s === 'z') {
    return { code: `${d}z`, name: HONORS[Number(d) - 1] ?? '?' };
  }
  const red = d === '0';
  return { code: `${d}${s}`, name: `${red ? '적5' : d}${SUITS[s]}`, red };
}
