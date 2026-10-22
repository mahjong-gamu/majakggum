#!/usr/bin/env node
// 마작 뉴스 글의 대표 이미지(cover)를 OpenAI 이미지 API로 만든다.
//
//   npm run cover                     cover 가 없는 뉴스 글 전부
//   npm run cover -- 2026-10-22-xxx   이 글만 (파일 이름에서 .md 를 뺀 것)
//   npm run cover -- 글이름 --force   이미 cover 가 있어도 다시 만들기
//   npm run cover -- --dry            API 호출 없이 프롬프트만 보기
//
// 필요한 것: 환경변수 OPENAI_API_KEY (내 컴퓨터에서는 저장소 맨 위 .env 파일, GitHub에서는 Secrets)
//
// 하는 일
//   1. src/content/news/*.md 를 읽고, cover 가 없고 draft·autoCover:false 가 아닌 글을 고른다.
//   2. 장면 문장을 정한다: 글에 coverPrompt 가 있으면 그것, 없으면 작은 텍스트 모델이 기사에서 뽑는다.
//      이때 실존 인물·이름·로고·글자·돈/칩·패 클로즈업을 넣지 않도록 지시하고, 결과를 다시 검사한다.
//   3. 고정 스타일 + 장면 + 금지 목록으로 최종 프롬프트를 만들어 이미지를 받는다.
//   4. public/images/news/<글이름>.webp 로 저장하고 글 머리말에 cover: 줄을 넣는다.
//   5. 쓴 프롬프트는 scripts/cover-prompts.json 에 남긴다(다시 만들거나 확인할 때 참고).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEWS_DIR = path.join(ROOT, 'src/content/news');
const IMG_DIR = path.join(ROOT, 'public/images/news');
const LOG_FILE = path.join(ROOT, 'scripts/cover-prompts.json');

const API = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-6-luna';
const QUALITY = process.env.COVER_QUALITY || 'medium';
const SIZE = '1536x864'; // 16:9 — 글 상단(최대 960×520)과 목록 카드(가로로 긴 띠)에 맞춤

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
async function call(endpoint, body, tries = 2) {
  for (let i = 1; ; i++) {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json;
    const msg = json?.error?.message || res.statusText;
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

function outputText(resp) {
  if (typeof resp.output_text === 'string') return resp.output_text;
  return (resp.output || [])
    .flatMap((o) => o.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('');
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
  if (!KEY) return { ...fallbackScene(data), source: 'fallback (no key)' };

  const article = `제목: ${data.title}\n분류: ${data.meta || ''}\n요약: ${data.excerpt || ''}\n\n${body.replace(/^## 출처[\s\S]*$/m, '').slice(0, 2500)}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await call('/responses', {
        model: TEXT_MODEL,
        instructions: SCENE_RULES,
        input: article,
        text: {
          format: {
            type: 'json_schema',
            name: 'cover_scene',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['scene', 'mood'],
              properties: { scene: { type: 'string' }, mood: { type: 'string' } },
            },
          },
        },
      });
      const out = JSON.parse(outputText(resp));
      const issues = [...sceneProblems(out.scene), ...sceneProblems(out.mood)];
      if (!issues.length) return { scene: out.scene.trim(), mood: out.mood.trim(), source: TEXT_MODEL };
      console.warn(`  ! 장면 문장 거부 (${issues.join('; ')}): ${out.scene}`);
    } catch (e) {
      console.warn(`  ! 장면 문장 만들기 실패: ${e.message}`);
      break;
    }
  }
  return { ...fallbackScene(data), source: 'fallback' };
}

function buildPrompt({ scene, mood }) {
  return [STYLE, `Scene: ${scene}`, mood && `Mood: ${mood}.`, AVOID].filter(Boolean).join('\n');
}

async function makeImage(prompt) {
  const resp = await call('/images/generations', {
    model: IMAGE_MODEL,
    prompt,
    size: SIZE,
    quality: QUALITY,
    output_format: 'webp',
    output_compression: 82,
    n: 1,
  });
  const b64 = resp?.data?.[0]?.b64_json;
  if (!b64) throw new Error('이미지가 응답에 없습니다');
  return Buffer.from(b64, 'base64');
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!KEY && !DRY) {
    console.error('OPENAI_API_KEY 가 없습니다. 저장소 맨 위 .env 파일이나 GitHub Secrets 에 넣어 주세요. (--dry 로 프롬프트만 볼 수 있습니다)');
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
      const img = await makeImage(prompt);
      const rel = `/images/news/${t.slug}.webp`;
      fs.writeFileSync(path.join(ROOT, 'public', rel), img);
      addCover(t.file, rel);
      log[t.slug] = { prompt, scene: scene.scene, mood: scene.mood, sceneFrom: scene.source, model: IMAGE_MODEL, quality: QUALITY, size: SIZE, createdAt: new Date().toISOString() };
      fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + '\n');
      console.log(`  ✓ ${rel} (${Math.round(img.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      const hint =
        e.status === 401 ? ' — API 키가 틀렸거나 만료됐습니다'
        : e.status === 403 ? ' — 조직 인증(Organization Verification)이 필요할 수 있습니다'
        : e.status === 429 ? ' — 사용 한도나 결제 잔액을 확인하세요'
        : e.status === 400 && /safety|moderation/i.test(e.message) ? ' — 안전 필터에 걸렸습니다. 글에 coverPrompt 를 직접 적어 다시 시도하세요'
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
