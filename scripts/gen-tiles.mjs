// 마작패 SVG 이미지를 public/tiles/ 에 만듭니다.
// 고전 스타일: 흰 앞면 + 검정 테두리, 붓글씨 한자, 남색 통, 마디 있는 대나무 삭.
// 한자는 LXGW WenKai TC 글꼴에서 윤곽선(path)으로 뽑아 넣기 때문에 어느 컴퓨터에서도 똑같이 보입니다.
// 다시 만들려면: npm run tiles
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'tiles');
const fontDir = path.join(root, 'node_modules', '@fontsource', 'lxgw-wenkai-tc', 'files');
const fonts = fs.readdirSync(fontDir).filter((f) => /-\d+-700-normal\.woff$/.test(f))
  .map((f) => opentype.parse(new Uint8Array(fs.readFileSync(path.join(fontDir, f))).buffer));

const C = { ink: '#151515', red: '#d4201b', redDark: '#8f1410', navy: '#1f2b7b', green: '#25801f', greenDark: '#155011' };

// 같은 종류의 글자는 같은 글꼴 크기(size)로 그리고, 글자 모양의 가운데를 (cx, cy)에 맞춥니다.
// boldPx: 글자 둘레에 같은 색 선을 더해 붓글씨처럼 굵게 (px 단위)
function glyphAt(ch, cx, cy, size, fill, boldPx) {
  const font = fonts.find((f) => f.charToGlyphIndex(ch) > 0);
  if (!font) throw new Error(`글꼴에 없는 글자: ${ch}`);
  const p = font.getPath(ch, 0, 0, 100);
  const bb = p.getBoundingBox();
  const s = size / 100;
  const tx = cx - ((bb.x1 + bb.x2) / 2) * s;
  const ty = cy - ((bb.y1 + bb.y2) / 2) * s;
  const stroke = boldPx ? ` stroke="${fill}" stroke-width="${(boldPx / s).toFixed(2)}" stroke-linejoin="round"` : '';
  // 소수점 2자리 이상이어야 획이 깨지지 않습니다
  return `<path fill="${fill}"${stroke} transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})" d="${p.toPathData(2)}"/>`;
}

// ---------- 패 바탕: 60×78, 흰 앞면 + 굵은 검정 테두리 ----------
function tile(body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 78" width="60" height="78" role="img" aria-label="${title}">
<rect x="1.4" y="1.4" width="57.2" height="75.2" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="2.4"/>
${body}
</svg>
`;
}

// ---------- 만수(萬子): 숫자는 모두 크기 32, 萬은 39 ----------
const NUM = ['', '一', '二', '三', '四', '伍', '六', '七', '八', '九'];
const manzu = (n, aka = false) => glyphAt(NUM[n], 30, 19.5, 32, aka ? C.red : C.ink, 1.4) + glyphAt('萬', 30, 53.5, 39, C.red, 1.0);

// ---------- 통수(筒子): 남색 고리 안에 점 8개 ----------
function coin(cx, cy, r, c) {
  const dots = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `<circle cx="${(cx + Math.cos(a) * r * 0.58).toFixed(2)}" cy="${(cy + Math.sin(a) * r * 0.58).toFixed(2)}" r="${(r * 0.165).toFixed(2)}" fill="${c}"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.8).toFixed(2)}" fill="#fff"/>`
    + dots
    + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.32).toFixed(2)}" fill="${c}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.13).toFixed(2)}" fill="#fff"/>`;
}

function bigCoin() {
  const cx = 30, cy = 39;
  const ring = (n, rr, size, fill) => Array.from({ length: n }, (_, k) => {
    const a = (k * 2 * Math.PI) / n;
    return `<circle cx="${(cx + Math.cos(a) * rr).toFixed(2)}" cy="${(cy + Math.sin(a) * rr).toFixed(2)}" r="${size}" fill="${fill}"/>`;
  }).join('');
  const petals = Array.from({ length: 8 }, (_, k) =>
    `<ellipse cx="${cx}" cy="${cy - 6}" rx="2" ry="3.6" fill="${C.red}" transform="rotate(${k * 45} ${cx} ${cy})"/>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="23" fill="${C.navy}"/>`
    + ring(20, 20.2, 1.3, '#fff')
    + `<circle cx="${cx}" cy="${cy}" r="17.5" fill="#fff"/>`
    + `<circle cx="${cx}" cy="${cy}" r="15.5" fill="none" stroke="${C.navy}" stroke-width="1.4"/>`
    + ring(12, 12.6, 1.6, C.navy)
    + `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="${C.red}" stroke-width="1"/>`
    + petals
    + `<circle cx="${cx}" cy="${cy}" r="2.6" fill="${C.red}"/>`;
}

const N = C.navy, R = C.red;
const PIN = {
  2: [[30, 21, 12, N], [30, 57, 12, N]],
  3: [[16, 17, 10.2, N], [30, 39, 10.2, R], [44, 61, 10.2, N]],
  4: [[18, 22, 11, N], [42, 22, 11, N], [18, 56, 11, N], [42, 56, 11, N]],
  5: [[17, 17, 9.6, N], [43, 17, 9.6, N], [30, 39, 9.6, R], [17, 61, 9.6, N], [43, 61, 9.6, N]],
  6: [[19, 15, 8.8, N], [41, 15, 8.8, N], [19, 42, 8.8, R], [41, 42, 8.8, R], [19, 62, 8.8, R], [41, 62, 8.8, R]],
  7: [[14, 12.5, 7.4, N], [30, 19.5, 7.4, N], [46, 26.5, 7.4, N], [19, 45, 8.2, R], [41, 45, 8.2, R], [19, 63, 8.2, R], [41, 63, 8.2, R]],
  8: [19, 41].flatMap((x) => [13, 30, 47, 64].map((y) => [x, y, 7.9, N])),
  9: [[15, N], [39, R], [63, N]].flatMap(([y, c]) => [14, 30, 46].map((x) => [x, y, 7.7, c])),
};
const pinzu = (n, aka = false) => (n === 1 ? bigCoin() : PIN[n].map(([x, y, r, c]) => coin(x, y, r, aka ? R : c)).join(''));

// ---------- 삭수(索子): 마디가 셋 있는 대나무 ----------
function stick(cx, cy, h, color, angle = 0) {
  const dark = color === C.red ? C.redDark : C.greenDark;
  const cap = (y) => `<rect x="-4.2" y="${y.toFixed(2)}" width="8.4" height="3.2" rx="1.6" fill="${color}" stroke="${dark}" stroke-width="0.7"/>`;
  return `<g transform="translate(${cx} ${cy}) rotate(${angle})">`
    + `<rect x="-2.8" y="${(-h / 2 + 1.5).toFixed(2)}" width="5.6" height="${(h - 3).toFixed(2)}" fill="${color}" stroke="${dark}" stroke-width="0.7"/>`
    + cap(-h / 2) + cap(-1.6) + cap(h / 2 - 3.2)
    + `<path d="M0 ${(-h / 2 + 4).toFixed(2)} V -2.6 M0 2.6 V ${(h / 2 - 4).toFixed(2)}" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>`
    + `</g>`;
}
const G = C.green;
const SOU = {
  2: [[30, 21, 27, G], [30, 57, 27, G]],
  3: [[30, 21, 27, G], [19, 57, 27, G], [41, 57, 27, G]],
  4: [[19, 21, 27, G], [41, 21, 27, G], [19, 57, 27, G], [41, 57, 27, G]],
  5: [[15, 21, 27, G], [45, 21, 27, G], [30, 39, 22, R], [15, 57, 27, G], [45, 57, 27, G]],
  6: [14, 30, 46].flatMap((x) => [[x, 21, 27, G], [x, 57, 27, G]]),
  7: [[30, 14, 19, R], ...[14, 30, 46].flatMap((x) => [[x, 39, 19, G], [x, 61.5, 19, G]])],
  // 8삭: 양옆은 세운 막대, 위 가운데는 ∧, 아래 가운데는 ∨
  8: [
    [12, 23, 26, G], [48, 23, 26, G], [12, 56, 26, G], [48, 56, 26, G],
    [24, 24.5, 25, G, 29.7], [36, 24.5, 25, G, -29.7],
    [24, 55.5, 25, G, -29.7], [36, 55.5, 25, G, 29.7],
  ],
  9: [16, 39, 62].flatMap((y) => [[14, y, 20, G], [30, y, 20, R], [46, y, 20, G]]),
};

// 1삭: 정면을 보는 공작 — 회색 볏 깃털, 눈무늬가 있는 둥근 초록 꼬리, 양쪽 날개, 빨간 다리
function peacock() {
  const cx = 30, cy = 31;
  const g = C.green, dk = C.greenDark;
  const spikes = Array.from({ length: 23 }, (_, i) => {
    const a = (-172 + i * (164 / 22)) * Math.PI / 180;
    const len = [23, 20.5, 22][i % 3];
    const p = (r, da) => `${(cx + Math.cos(a + da) * r).toFixed(2)} ${(cy + Math.sin(a + da) * r).toFixed(2)}`;
    return `<path d="M${p(12, -0.09)} L${p(len, 0)} L${p(12, 0.09)} Z" fill="${i % 2 ? '#7d8185' : '#55595d'}"/>`;
  }).join('');
  const eyes = [[26, 23.5], [34, 23.5], [19.5, 28.5], [26.5, 28.5], [33.5, 28.5], [40.5, 28.5],
    [19.5, 34], [26.5, 34], [33.5, 34], [40.5, 34], [26, 39.5], [34, 39.5]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/><circle cx="${x}" cy="${y}" r="1.05" fill="#222"/>`).join('');
  const wingLines = (s) => [[-6, -6], [-7.5, -3], [-8, 0], [-7.5, 3], [-6, 5.5]].map(([dx, dy]) =>
    `<path d="M${30 + s * 7} 46 q${s * -3} ${dy * 0.3} ${s * dx * 1.6} ${dy}" stroke="${g}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`).join('');
  const wing = (s) => {
    const x0 = 30 + s * 2, x1 = 30 + s * 21;
    return `<path d="M${x0} 61 L${x0} 50 Q${30 + s * 14} 47 ${x1} 61 Z" fill="${g}" stroke="${dk}" stroke-width="0.6"/>`
      + [0.3, 0.55, 0.8].map((t) => `<path d="M${x0} 60 L${(x0 + (x1 - x0) * t).toFixed(1)} ${(50 + t * 6).toFixed(1)}" stroke="#fff" stroke-width="0.8"/>`).join('');
  };
  return spikes
    + `<ellipse cx="${cx}" cy="${cy + 0.5}" rx="16" ry="13.5" fill="${g}" stroke="${dk}" stroke-width="0.6"/>`
    + eyes
    + wingLines(-1) + wingLines(1)
    + wing(-1) + wing(1)
    + `<path d="M26.5 45 Q30 42 33.5 45 L33 60 Q30 62 27 60 Z" fill="${g}" stroke="${dk}" stroke-width="0.6"/>`
    + `<path d="M28 49 L30 52 L32 49 M28 54 L30 57 L32 54" stroke="#fff" stroke-width="0.8" fill="none"/>`
    + `<circle cx="24.5" cy="46.5" r="2.4" fill="${g}"/><circle cx="24" cy="46" r="0.6" fill="#fff"/>`
    + `<path d="M22.4 46 L19.2 47.4 L22.4 47.8 Z" fill="${C.red}"/>`
    + `<path d="M27.5 61.5 V68.5 M32.5 61.5 V68.5 M27.5 68.5 l-3.4 1.4 M27.5 68.5 l1.6 1.8 M32.5 68.5 l-3.4 1.4 M32.5 68.5 l1.6 1.8" stroke="${C.red}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
}
const souzu = (n, aka = false) => (n === 1 ? peacock() : SOU[n].map(([x, y, h, c, a = 0]) => stick(x, y, h, aka ? R : c, a)).join(''));

// ---------- 자패(字牌): 모두 크기 50, 白은 빈 패 ----------
const HON = [['東', C.ink], ['南', C.ink], ['西', C.ink], ['北', C.ink], [null], ['發', C.green], ['中', C.red]];
const honor = (i) => {
  const [ch, c] = HON[i - 1];
  return ch ? glyphAt(ch, 30, 39, 50, c, 1.3) : '';
};

// ---------- 패 뒷면 ----------
const back = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 78" width="60" height="78" role="img" aria-label="패 뒷면">
<rect x="1.4" y="1.4" width="57.2" height="75.2" rx="6" fill="#1f6450" stroke="${C.ink}" stroke-width="2.4"/>
<rect x="6" y="6" width="48" height="66" rx="3.5" fill="none" stroke="#fff" stroke-opacity="0.22"/>
</svg>
`;

// ---------- 저장 ----------
fs.mkdirSync(outDir, { recursive: true });
const names = { m: '만', p: '통', s: '삭' };
const honorNames = ['동', '남', '서', '북', '백', '발', '중'];
let count = 0;
const write = (file, svg) => { fs.writeFileSync(path.join(outDir, file), svg); count++; };

for (let n = 1; n <= 9; n++) {
  write(`${n}m.svg`, tile(manzu(n), `${n}${names.m}`));
  write(`${n}p.svg`, tile(pinzu(n), `${n}${names.p}`));
  write(`${n}s.svg`, tile(souzu(n), `${n}${names.s}`));
}
write('0m.svg', tile(manzu(5, true), `적5${names.m}`));
write('0p.svg', tile(pinzu(5, true), `적5${names.p}`));
write('0s.svg', tile(souzu(5, true), `적5${names.s}`));
for (let i = 1; i <= 7; i++) write(`${i}z.svg`, tile(honor(i), honorNames[i - 1]));
write('back.svg', back());

console.log(`패 이미지 ${count}개를 만들었습니다 → public/tiles/`);
