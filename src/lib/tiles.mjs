// 패 표기(예: 3456m234p067s88p9s, 0 = 적5, 1z~7z = 東南西北白發中)를 패 목록으로 바꿉니다.
// 패 그림은 public/tiles/{code}.svg 에 있습니다 (scripts/gen-tiles.mjs 로 만듦).
const SUITS = { m: '만', p: '통', s: '삭' };
const HONORS = ['동', '남', '서', '북', '백', '발', '중'];

// 본문용 확장 표기: 숫자 뒤 ^ = 옆으로 눕힘(울어 온 패), ^^ = 눕힌 패 2장을 겹침(가깡),
// # = 뒷면, 띄어쓰기 = 묶음 사이 간격. 예) `4^23m` 치, `#33#z` 안깡, `88m234p 23m 4m`
const GROUP = '(?:(?:[0-9]\\^{0,2}|#)+[mpsz])+';
export const TILE_PATTERN = new RegExp(`^${GROUP}(?:\\s+${GROUP})*$`);

export function parseTiles(str = '') {
  const out = [];
  let buf = [];
  for (const c of String(str).replace(/\s+/g, '')) {
    if ('mpsz'.includes(c)) {
      for (const b of buf) {
        const t = b.d === '#' ? { code: 'back', name: '뒷면' } : makeTile(b.d, c);
        if (b.side) t.side = true;
        if (b.stack) t.stack = true;
        out.push(t);
      }
      buf = [];
    } else if (/[0-9#]/.test(c)) {
      buf.push({ d: c });
    } else if (c === '^' && buf.length) {
      const last = buf[buf.length - 1];
      if (last.side) last.stack = true;
      else last.side = true;
    }
  }
  return out;
}

// 띄어쓰기로 나눈 묶음별 패 목록
export function parseTileGroups(str = '') {
  return String(str).trim().split(/\s+/).map(parseTiles);
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
