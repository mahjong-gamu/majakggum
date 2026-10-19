// 마작패 SVG 이미지를 public/tiles/ 에 만듭니다.
// 한자는 Noto Serif JP 글꼴에서 윤곽선(path)으로 뽑아 넣기 때문에 어느 컴퓨터에서도 똑같이 보입니다.
// 다시 만들려면: npm run tiles
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'tiles');
const fontDir = path.join(root, 'node_modules', '@fontsource', 'noto-serif-jp', 'files');

const C = {
  ink: '#1c1f2b',
  red: '#c5302a',
  green: '#1d7350',
  blue: '#1f4f96',
  gold: '#d39b1c',
  face: '#fffdf6',
};

// ---------- 글꼴에서 한자 윤곽선 꺼내기 ----------
const fontCache = new Map();
function fontsFor(weight) {
  if (!fontCache.has(weight)) {
    const files = fs.readdirSync(fontDir).filter((f) => f.endsWith(`-${weight}-normal.woff`) && /-\d+-/.test(f));
    fontCache.set(weight, files.map((f) => opentype.parse(new Uint8Array(fs.readFileSync(path.join(fontDir, f))).buffer)));
  }
  return fontCache.get(weight);
}

// 글자를 (x, y, w, h) 상자 안 가운데에 꽉 차게 그립니다.
function glyph(ch, box, fill, weight = 700) {
  const font = fontsFor(weight).find((f) => f.charToGlyphIndex(ch) > 0);
  if (!font) throw new Error(`글꼴에 없는 글자: ${ch}`);
  const p = font.getPath(ch, 0, 0, 100);
  const bb = p.getBoundingBox();
  const s = Math.min(box.w / (bb.x2 - bb.x1), box.h / (bb.y2 - bb.y1));
  const tx = box.x + (box.w - (bb.x2 - bb.x1) * s) / 2 - bb.x1 * s;
  const ty = box.y + (box.h - (bb.y2 - bb.y1) * s) / 2 - bb.y1 * s;
  return `<path fill="${fill}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})" d="${p.toPathData(1)}"/>`;
}

// ---------- 패 바탕 ----------
// 60×80: 위 74px가 앞면, 아래로 보이는 초록 부분이 패 뒷면의 두께입니다.
function tile(body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="60" height="80" role="img" aria-label="${title}">
<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffefa"/><stop offset="1" stop-color="#f1eadb"/></linearGradient></defs>
<rect x="0.5" y="3" width="59" height="76.5" rx="7" fill="#1f6450"/>
<rect x="0.5" y="0.5" width="59" height="73" rx="7" fill="url(#f)" stroke="#cfc6b1"/>
<rect x="2.5" y="2.5" width="55" height="69" rx="5.5" fill="none" stroke="#fff" stroke-opacity="0.8"/>
${body}
</svg>
`;
}

// ---------- 통수(筒子) ----------
function coin(cx, cy, r, color) {
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.8).toFixed(2)}" fill="${C.face}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(2)}" fill="${color}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.36).toFixed(2)}" fill="${C.face}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.18).toFixed(2)}" fill="${color}"/>`,
  ].join('');
}

function bigCoin() {
  const cx = 30, cy = 37;
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<circle cx="${(cx + Math.cos(a) * 15.5).toFixed(2)}" cy="${(cy + Math.sin(a) * 15.5).toFixed(2)}" r="2.1" fill="${C.red}"/>`;
  }).join('');
  return [
    `<circle cx="${cx}" cy="${cy}" r="22" fill="${C.green}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="19.5" fill="${C.face}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="${C.blue}" stroke-width="1.2"/>`,
    petals,
    `<circle cx="${cx}" cy="${cy}" r="11.5" fill="${C.blue}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${C.face}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${C.red}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.face}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="1.4" fill="${C.red}"/>`,
  ].join('');
}

const B = C.blue, G = C.green, R = C.red;
const PIN = {
  2: [[30, 22, 12, G], [30, 52, 12, B]],
  3: [[16, 17, 9.5, B], [30, 37, 9.5, R], [44, 57, 9.5, G]],
  4: [[19, 23, 10, B], [41, 23, 10, G], [19, 51, 10, G], [41, 51, 10, B]],
  5: [[17, 18, 9, B], [43, 18, 9, G], [30, 37, 9, R], [17, 56, 9, G], [43, 56, 9, B]],
  6: [[19, 16, 8.3, G], [41, 16, 8.3, G], [19, 41, 8.3, R], [41, 41, 8.3, R], [19, 60, 8.3, R], [41, 60, 8.3, R]],
  7: [[14, 12, 6.8, G], [30, 19, 6.8, G], [46, 26, 6.8, G], [19, 44, 7.6, R], [41, 44, 7.6, R], [19, 61, 7.6, R], [41, 61, 7.6, R]],
  8: [20, 40].flatMap((x) => [13, 29, 45, 61].map((y) => [x, y, 7.2, B])),
  9: [[15, B], [37, R], [59, G]].flatMap(([y, c]) => [14, 30, 46].map((x) => [x, y, 7.4, c])),
};

function pinzu(n, aka = false) {
  if (n === 1) return bigCoin();
  return PIN[n].map(([x, y, r, c]) => coin(x, y, r, aka ? R : c)).join('');
}

// ---------- 삭수(索子) ----------
function stick(cx, cy, h, color, angle = 0) {
  const w = 7.6;
  const top = -h / 2;
  return `<g transform="translate(${cx} ${cy}) rotate(${angle})">`
    + `<rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" rx="${w / 2}" fill="${color}"/>`
    + `<rect x="${-w / 2}" y="${(-h / 6 - 0.6).toFixed(2)}" width="${w}" height="1.3" fill="${C.face}"/>`
    + `<rect x="${-w / 2}" y="${(h / 6 - 0.6).toFixed(2)}" width="${w}" height="1.3" fill="${C.face}"/>`
    + `<rect x="-0.55" y="${(top + 2.2).toFixed(2)}" width="1.1" height="${(h - 4.4).toFixed(2)}" rx="0.55" fill="${C.face}" fill-opacity="0.55"/>`
    + `</g>`;
}

const SOU = {
  2: [[30, 21, 27, G], [30, 53, 27, G]],
  3: [[30, 21, 27, G], [19, 53, 27, G], [41, 53, 27, G]],
  4: [[19, 21, 27, G], [41, 21, 27, G], [19, 53, 27, G], [41, 53, 27, G]],
  5: [[15, 21, 27, G], [45, 21, 27, G], [30, 37, 24, R], [15, 53, 27, G], [45, 53, 27, G]],
  6: [14, 30, 46].flatMap((x) => [[x, 21, 27, G], [x, 53, 27, G]]),
  7: [[30, 14, 18, R], ...[14, 30, 46].flatMap((x) => [[x, 37, 18, G], [x, 59, 18, G]])],
  8: [
    [9, 21, 27, G, 0], [23, 21, 27, G, 20], [37, 21, 27, G, -20], [51, 21, 27, G, 0],
    [9, 53, 27, G, 0], [23, 53, 27, G, -20], [37, 53, 27, G, 20], [51, 53, 27, G, 0],
  ],
  9: [14, 37, 60].flatMap((y) => [[14, y, 19, G], [30, y, 19, R], [46, y, 19, G]]),
};

// 1삭은 새 그림
function bird() {
  const pivot = [36, 47];
  const feathers = [-55, -28, 0, 28, 55].map((a, i) => {
    const c = i % 2 ? C.blue : C.green;
    return `<g transform="rotate(${a} ${pivot[0]} ${pivot[1]})">`
      + `<ellipse cx="36" cy="27" rx="5.6" ry="14" fill="${c}"/>`
      + `<circle cx="36" cy="19" r="3" fill="${C.face}"/><circle cx="36" cy="19" r="1.7" fill="${C.red}"/>`
      + `</g>`;
  }).join('');
  return [
    feathers,
    `<ellipse cx="27" cy="51" rx="12" ry="9.5" fill="${C.green}"/>`,
    `<path d="M20 52 Q27 58 36 50" fill="none" stroke="${C.face}" stroke-width="1.3" stroke-linecap="round"/>`,
    `<path d="M18 46 Q14 40 16 33" fill="none" stroke="${C.green}" stroke-width="6" stroke-linecap="round"/>`,
    `<circle cx="16" cy="32" r="5.6" fill="${C.red}"/>`,
    `<circle cx="14.6" cy="31" r="1.3" fill="${C.face}"/>`,
    `<path d="M11 31.2 L4.5 33.6 L11 35 Z" fill="${C.gold}"/>`,
    `<path d="M24 60 L22 68 M30 60 L31 68" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`,
  ].join('');
}

function souzu(n, aka = false) {
  if (n === 1) return bird();
  return SOU[n].map(([x, y, h, c, a = 0]) => stick(x, y, h, aka ? R : c, a)).join('');
}

// ---------- 만수(萬子) ----------
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function manzu(n, aka = false) {
  const numBox = { x: 13, y: 7, w: 34, h: n === 1 ? 20 : 27 };
  if (n === 1) numBox.y = 14;
  return glyph(NUM[n], numBox, aka ? R : C.ink, 900) + glyph('萬', { x: 9, y: 39, w: 42, h: 30 }, R, 700);
}

// ---------- 자패(字牌) ----------
const HONORS = [
  ['東', C.ink], ['南', C.ink], ['西', C.ink], ['北', C.ink], ['白', null], ['發', C.green], ['中', C.red],
];
function honor(i) {
  const [ch, color] = HONORS[i - 1];
  if (!color) {
    return `<rect x="12" y="13" width="36" height="48" rx="3" fill="none" stroke="${C.blue}" stroke-width="3"/>`
      + `<rect x="17" y="18" width="26" height="38" rx="1.5" fill="none" stroke="${C.blue}" stroke-width="1.2"/>`;
  }
  return glyph(ch, { x: 8, y: 9, w: 44, h: 56 }, color, 900);
}

// ---------- 패 뒷면 ----------
function back() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="60" height="80" role="img" aria-label="패 뒷면">
<rect x="0.5" y="3" width="59" height="76.5" rx="7" fill="#e9e1cd"/>
<rect x="0.5" y="0.5" width="59" height="73" rx="7" fill="#1f6450" stroke="#164a3b"/>
<rect x="5" y="5" width="50" height="64" rx="4" fill="none" stroke="#fff" stroke-opacity="0.18"/>
</svg>
`;
}

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
