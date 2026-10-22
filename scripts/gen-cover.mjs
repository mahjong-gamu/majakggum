#!/usr/bin/env node
// 마작 뉴스 글의 대표 이미지(cover)를 Cloudflare Workers AI(무료 사용량 안)로 만든다.
//
//   npm run cover                     cover 가 없는 뉴스 글 전부
//   npm run cover -- 2026-10-22-xxx   이 글만 (파일 이름에서 .md 를 뺀 것)
//   npm run cover -- 글이름 --force   이미 cover 가 있어도 다시 만들기
//   npm run cover -- --dry            API 호출 없이 프롬프트만 보기
//
// 필요한 것: 환경변수 CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_TOKEN
//   (내 컴퓨터에서는 저장소 맨 위 .env 파일, GitHub에서는 Secrets)
//
// 하는 일
//   1. src/content/news/*.md 를 읽고, cover 가 없고 draft·autoCover:false 가 아닌 글을 고른다.
//   2. 장면 문장을 정한다: 글에 coverPrompt 가 있으면 그것, 없으면 작은 텍스트 모델이 기사에서 뽑는다.
//      이때 실존 인물·이름·로고·글자·돈/칩·패 클로즈업을 넣지 않도록 지시하고, 결과를 다시 검사한다.
//   3. 고정 스타일 + 장면 + 금지 목록으로 최종 프롬프트를 만들어 이미지를 받는다.
//   4. public/images/news/<글이름>.jpg(또는 .png) 로 저장하고 글 머리말에 cover: 줄을 넣는다.
//   5. 쓴 프롬프트는 scripts/cover-prompts.json 에 남긴다(다시 만들거나 확인할 때 참고).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEWS_DIR = path.join(ROOT, 'src/content/news');
const IMG_DIR = path.join(ROOT, 'public/images/news');
const LOG_FILE = path.join(ROOT, 'scripts/cover-prompts.json');

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const KEY = process.env.CLOUDFLARE_AI_TOKEN;
const API = process.env.CF_AI_BASE_URL || `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run`;
const IMAGE_MODEL = process.env.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b';
const TEXT_MODEL = process.env.CF_TEXT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const WIDTH = 1536, HEIGHT = 864; // 16:9 — 글 상단(최대 960×520)과 목록 카드(가로로 긴 띠)에 맞춤
const SIZE = `${WIDTH}x${HEIGHT}`;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY = args.includes('--dry');
const ONLY = args.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\.md$/, ''));

// ── 고정 스타일: 모든 이미지에 똑같이 붙는다 (사이트 색: 짙은 초록·크림·주홍) ──────────
const STYLE = [
  'Editorial cover illustration for a Korean riichi mahjong news blog.',
  'Style: calm, minimal flat illustration with soft grain texture and gentle light, clean shapes, no clutter.',
  'Palette: deep forest green (#1e3932), warm cream (#f2f0eb), muted vermilion accent (#c9502e), a touch of soft gold.',
  'Composition: wide 16:9, main subject in the center third with generous margins, because the image is also cropped into a short wide strip.',
].join(' ');

// ── 금지 목록: 프롬프트 끝에 항상 붙는다 ─────────────────────────────────────
const AVOID = [
  'Strictly avoid:',
  'any text, letters, numbers, kanji, hangul, captions, signs or watermarks;',
  'real or identifiable people, faces or portraits (people may appear only as small faceless silhouettes or hands seen from behind);',
  'logos, team emblems, brand marks, broadcast screens, game characters or anime characters;',
  'money, banknotes, coins, poker chips, betting, casinos, cigarettes or alcohol;',
  'close-up mahjong tile faces (tiles only face-down, from the back, blurred, or far away).',
].join(' ');

// 텍스트 모델에게 주는 장면 작성 규칙
const SCENE_RULES = `You write the scene for a cover illustration of one Korean mahjong news article.
Read the article and return JSON: {"scene": "...", "mood": "..."}.
- "scene": one or two English sentences (max 60 words) describing a single symbolic, atmospheric scene that matches the article's mood (e.g. a quiet tournament hall under one spotlight, an empty mahjong table at dawn, a train toward a regional city, a stack of new books, a phone screen glowing in a dark room).
- "mood": 2-6 English words (e.g. "tense, hopeful", "festive, warm").
Hard rules for "scene":
- Never name or describe any real person, team, organization, company, game, broadcaster, venue or event. No proper nouns at all.
- No faces or recognizable people. People may appear only as small faceless silhouettes or hands seen from behind.
- No text, letters, numbers, scores, signs, logos, emblems, screens showing content, game or anime characters.
- No money, chips, betting, casinos, cigarettes or alcohol. Mahjong is shown as a mind sport.
- Mahjong tiles only face-down, from the back, blurred or far away. Never describe specific tiles or hands.
Return only the JSON.`;

// 텍스트 모델이 실패하거나 규칙을 어겼을 때 쓰는 주제별 기본 장면
const FALLBACK = [
  { re: /한국|KML|교류|방한|초청/, scene: 'Two mahjong tables side by side in a warm, quiet hall, tiles face-down, a soft beam of light connecting them like a bridge between two places.', mood: 'friendly, anticipating' },
  { re: /M리그|리그|최강전|토너먼트|대회|결승/, scene: 'A single mahjong table under one dramatic spotlight in a dark arena, face-down tiles neatly set, empty chairs waiting.', mood: 'tense, dramatic' },
  { re: /타이틀|우승|결정전|위$/, scene: 'A mahjong table at the end of a long match, tiles pushed together face-down, a small gold trophy shape glowing softly beside it.', mood: 'triumphant, quiet' },
  { re: /단체|지부|제도|신설|창설|조직|규정/, scene: 'A simple map-like landscape of cream hills with small glowing mahjong tables appearing in new places, connected by thin paths.', mood: 'growing, hopeful' },
  { re: /작혼|온라인|방송|게임|버추얼|책|출판|고교|저변/, scene: 'A phone and an open notebook on a cream desk at night, the phone glowing green with an abstract mahjong table pattern, no readable content.', mood: 'cozy, curious' },
];
const DEFAULT_SCENE = { scene: 'An empty mahjong table in a calm room at dawn, face-down tiles in neat walls, soft light through a window.', mood: 'calm, expectant' };

// ── 머리말(frontmatter) 읽기·쓰기 ─────────────────────────────────────────────
function readPost(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]\w*):\s*(.*?)\s*$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#\s.*$/, '');
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    data[kv[1]] = v;
  }
  return { raw, head: m[0], data, body: raw.slice(m[0].length) };
}

function addCover(file, coverPath) {
  const post = readPost(file);
  const lines = post.head.replace(/\r?\n?$/, '').split(/\r?\n/);
  const filtered = lines.filter((l) => !/^cover:/.test(l));
  filtered.splice(filtered.length - 1, 0, `cover: ${coverPath}`); // 닫는 --- 바로 위
  fs.writeFileSync(file, filtered.join('\n') + '\n' + post.body);
}

// ── OpenAI 호출 ────────────────────────────────────────────────────────────
// model: '@cf/...' 모델 이름, body: 객체(JSON) 또는 FormData(이미지 모델)
async function call(model, body, tries = 2) {
  for (let i = 1; ; i++) {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API}/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, ...(isForm ? {} : { 'Content-Type': 'application/json' }) },
      body: isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) return json.result ?? json;
    const msg = (json?.errors || []).map((e) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ') || json?.error?.message || res.statusText;
    if (i < tries && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }
}

// JSON 모드 응답: response 가 객체일 수도, 문자열일 수도 있다
function parseJsonResponse(result) {
  const r = result?.response;
  if (r && typeof r === 'object') return r;
  const text = String(r ?? '');
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}

// 장면 문장 검사: 이름(대문자 단어)·숫자·한글/일본어·금지어가 있으면 거부
const ALLOWED_CAPS = new Set(['A', 'An', 'The', 'Two', 'One', 'Japanese', 'Korean', 'Korea', 'Japan', 'Asian']);
const BANNED = /\b(money|cash|coins?|banknotes?|chips?|bet|betting|casino|gambl\w*|cigarettes?|smok\w*|alcohol|beer|logo|emblem|text|letters?|words?|sign(?:s|age)?|caption|portrait|face(?!-down|\s+down)|smil\w*|anime|character)\b/i;
function sceneProblems(s) {
  const issues = [];
  if (/[^\x00-\x7F]/.test(s)) issues.push('non-English characters');
  if (/\d/.test(s)) issues.push('digits');
  if (BANNED.test(s)) issues.push(`banned word "${s.match(BANNED)[0]}"`);
  const names = s
    .split(/(?<=[.!?])\s+/)
    .flatMap((sent) => sent.split(/\s+/).slice(1))
    .map((w) => w.replace(/[^A-Za-z-]/g, ''))
    .filter((w) => /^[A-Z]/.test(w) && !ALLOWED_CAPS.has(w));
  if (names.length) issues.push(`possible proper nouns: ${names.join(', ')}`);
  if (s.split(/\s+/).length > 80) issues.push('too long');
  return issues;
}

function fallbackScene(data) {
  // 분류(meta)를 먼저 보고, 없으면 제목으로 정한다
  return FALLBACK.find((f) => f.re.test(data.meta || '')) || FALLBACK.find((f) => f.re.test(data.title || '')) || DEFAULT_SCENE;
}

async function makeScene(data, body) {
  if (data.coverPrompt) {
    const issues = sceneProblems(data.coverPrompt);
    if (issues.length) console.warn(`  ! coverPrompt 확인 필요 (${issues.join('; ')}) — 그대로 씁니다`);
    return { scene: data.coverPrompt, mood: '', source: 'coverPrompt' };
  }
  if (!KEY || !ACCOUNT) return { ...fallbackScene(data), source: 'fallback (no key)' };

  const article = `제목: ${data.title}\n분류: ${data.meta || ''}\n요약: ${data.excerpt || ''}\n\n${body.replace(/^## 출처[\s\S]*$/m, '').slice(0, 2500)}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await call(TEXT_MODEL, {
        messages: [
          { role: 'system', content: SCENE_RULES },
          { role: 'user', content: article },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            type: 'object',
            required: ['scene', 'mood'],
            properties: { scene: { type: 'string' }, mood: { type: 'string' } },
          },
        },
        max_tokens: 300,
      });
      const out = parseJsonResponse(result);
      if (typeof out.scene !== 'string' || typeof out.mood !== 'string') throw new Error('JSON 형식이 다릅니다');
      const issues = [...sceneProblems(out.scene), ...sceneProblems(out.mood)];
      if (!issues.length) return { scene: out.scene.trim(), mood: out.mood.trim(), source: TEXT_MODEL };
      console.warn(`  ! 장면 문장 거부 (${issues.join('; ')}): ${out.scene}`);
    } catch (e) {
      console.warn(`  ! 장면 문장 만들기 실패: ${e.message}`);
      if (attempt === 2 || e.status === 401 || e.status === 403) break;
    }
  }
  return { ...fallbackScene(data), source: 'fallback' };
}

function buildPrompt({ scene, mood }) {
  return [STYLE, `Scene: ${scene}`, mood && `Mood: ${mood}.`, AVOID].filter(Boolean).join('\n');
}

async function makeImage(prompt) {
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(WIDTH));
  form.append('height', String(HEIGHT));
  const result = await call(IMAGE_MODEL, form);
  const b64 = result?.image;
  if (!b64) throw new Error('이미지가 응답에 없습니다');
  const buf = Buffer.from(b64, 'base64');
  // 파일 형식은 앞부분 바이트로 알아낸다
  const ext = buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg' : buf.slice(0, 4).toString('hex') === '89504e47' ? 'png' : buf.slice(8, 12).toString() === 'WEBP' ? 'webp' : 'jpg';
  return { buf, ext };
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
async function main() {
  if ((!KEY || !ACCOUNT) && !DRY) {
    console.error('CLOUDFLARE_ACCOUNT_ID 와 CLOUDFLARE_AI_TOKEN 이 필요합니다. 저장소 맨 위 .env 파일이나 GitHub Secrets 에 넣어 주세요. (--dry 로 프롬프트만 볼 수 있습니다)');
    process.exit(1);
  }

  const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md')).sort();
  const targets = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    if (ONLY.length && !ONLY.includes(slug)) continue;
    const post = readPost(path.join(NEWS_DIR, f));
    if (!post) continue;
    const d = post.data;
    if (d.draft === 'true' || d.autoCover === 'false') continue;
    if (d.cover && !FORCE) continue;
    targets.push({ slug, file: path.join(NEWS_DIR, f), post });
  }
  for (const s of ONLY) if (!files.includes(`${s}.md`)) console.warn(`! ${s}.md 를 src/content/news/ 에서 찾지 못했습니다`);

  if (!targets.length) {
    console.log('이미지를 만들 뉴스 글이 없습니다.');
    return;
  }

  const log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : {};
  fs.mkdirSync(IMG_DIR, { recursive: true });
  let failed = 0;

  for (const t of targets) {
    console.log(`\n▶ ${t.slug} — ${t.post.data.title}`);
    const scene = await makeScene(t.post.data, t.post.body);
    const prompt = buildPrompt(scene);
    console.log(`  장면(${scene.source}): ${scene.scene}`);
    if (DRY) {
      console.log('  ── 최종 프롬프트 ──\n' + prompt.replace(/^/gm, '  '));
      continue;
    }
    try {
      const { buf: img, ext } = await makeImage(prompt);
      const rel = `/images/news/${t.slug}.${ext}`;
      fs.writeFileSync(path.join(ROOT, 'public', rel), img);
      // 다시 만들 때 확장자가 바뀌었으면 예전 파일을 지운다
      const old = t.post.data.cover;
      if (old && old !== rel && old.startsWith('/images/news/')) fs.rmSync(path.join(ROOT, 'public', old), { force: true });
      addCover(t.file, rel);
      log[t.slug] = { prompt, scene: scene.scene, mood: scene.mood, sceneFrom: scene.source, model: IMAGE_MODEL, size: SIZE, createdAt: new Date().toISOString() };
      fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + '\n');
      console.log(`  ✓ ${rel} (${Math.round(img.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      const hint =
        e.status === 401 || e.status === 403 ? ' — 토큰이 틀렸거나 Workers AI 권한이 없습니다. 계정 ID도 확인하세요'
        : e.status === 429 || /neuron|quota|limit/i.test(e.message) ? ' — 오늘 무료 사용량(하루 1만 Neurons)을 다 썼을 수 있습니다. 내일(한국 시간 오전 9시 이후) 다시 실행하세요'
        : /nsfw|safety|flag/i.test(e.message) ? ' — 안전 필터에 걸렸습니다. 글에 coverPrompt 를 직접 적어 다시 시도하세요'
        : '';
      console.error(`  ✗ 실패: ${e.message}${hint}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
