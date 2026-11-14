// 용어 사전 (묶음 1). 데이터: src/data/glossary.yaml(항목) + glossary-pending.yaml(아직 없는 관련 용어의 이름표).
import { getCollection } from 'astro:content';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import glossaryRaw from '../data/glossary.yaml?raw';
import pendingRaw from '../data/glossary-pending.yaml?raw';
import { remarkPlugins, rehypePlugins } from './markdown-plugins.mjs';
import { GLOSSARY_CATEGORIES } from './glossary-meta.mjs';
import { getAllPosts, postUrl } from './posts';

// ───────── 공개 스위치 ─────────
// false 인 동안은 운영 사이트(빌드 결과)에 용어 사전 페이지가 만들어지지 않고, 메뉴·검색·사이트맵에도 안 나옵니다.
// 공개할 때는 이 값을 true 로 바꾸기만 하면 됩니다. (마작껌 PC 의 `npm run dev` 에서는 값과 상관없이 보입니다.)
export const GLOSSARY_PUBLIC = false;
export const GLOSSARY_VISIBLE = GLOSSARY_PUBLIC || import.meta.env.DEV;

// 「확인 필요」(check: true) 항목에 표시를 달지 여부. 공개 때 끄고 싶으면 false 로.
export const SHOW_CHECK_BADGE = true;

// 사전 전용 색·대표 패 (게시판 4개(BOARDS)에는 넣지 않습니다)
export const GLOSSARY = {
  key: 'glossary',
  label: '용어 사전',
  tint: '#EFE6C8',
  ink: '#74560A',
  wind: '6z',
  intro: '입문부터 중급까지, 이 사이트 글에 나오는 마작 용어를 모았습니다. 룰은 M리그 기준이고, 작혼과 다르면 따로 적었습니다.',
  batch: '2026-11 첫 묶음',
  path: '/glossary/',
} as const;

export const CATEGORIES: readonly string[] = GLOSSARY_CATEGORIES;
export const glossaryUrl = (id: string) => `/glossary/${id}/`;

export type GlossaryEntry = {
  id: string; term: string; ja: string; aka: string[]; category: string; short: string; tiles: string | null;
  han: { closed: number; open: number | null } | { yakuman: true } | null;
  rule_note: string | null; detail: string; related: string[]; sources: string[]; check: boolean;
};

// 초성 칸: ㄲ·ㄸ·ㅃ·ㅆ·ㅉ 은 ㄱ·ㄷ·ㅂ·ㅅ·ㅈ 칸에 넣고, 한글이 아닌 것은 맨 끝 「기타」
const CHO = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const INITIALS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', '기타'];
export function initialOf(term: string) {
  const c = term.trim().charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return CHO[Math.floor((c - 0xac00) / 588)];
  return '기타';
}

// 아직 사전에 없는 관련 용어: "id: 이름" 한 줄씩
function parsePending() {
  const map = new Map<string, string>();
  for (const line of pendingRaw.split(/\r?\n/)) {
    const m = line.match(/^([a-z0-9]+(?:-[a-z0-9]+)*):\s*(.+?)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

// 항목을 읽고 검사합니다. 형식 오류(스키마)는 content.config.ts 가, id 중복·관련 용어 id 는 여기서 빌드를 멈춥니다.
// 스위치와 상관없이 빌드할 때마다 돕니다(용어 페이지의 getStaticPaths 가 부릅니다).
export async function loadGlossary() {
  const entries = (await getCollection('glossary')).map((e) => e.data as GlossaryEntry);
  const pending = parsePending();

  const rawCount = (glossaryRaw.match(/^- id:/gm) || []).length;
  const ids = new Set(entries.map((e) => e.id));
  const problems: string[] = [];
  if (rawCount !== ids.size || entries.length !== ids.size) {
    const seen = new Set<string>();
    const dup = [...glossaryRaw.matchAll(/^- id:\s*(\S+)/gm)].map((m) => m[1]).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    problems.push(`id 가 겹칩니다: ${dup.join(', ') || '(확인 필요)'}`);
  }
  for (const e of entries) {
    for (const r of e.related) if (!ids.has(r) && !pending.has(r)) problems.push(`「${e.id}」의 related 「${r}」가 사전에도 glossary-pending.yaml 에도 없습니다`);
  }
  if (problems.length) throw new Error(`[용어 사전] 데이터 오류\n- ${problems.join('\n- ')}`);

  entries.sort((a, b) => a.term.localeCompare(b.term, 'ko'));
  return { entries, pending, ids };
}

// 본문(마크다운)과 패 표기는 글과 같은 규칙으로 그림이 됩니다 (플러그인 목록을 글과 같이 씀)
let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | undefined;
export async function renderMd(src: string) {
  processor ??= await createMarkdownProcessor({ remarkPlugins, rehypePlugins } as any);
  return (await processor.render(src)).code;
}

const HOSTS: [RegExp, string][] = [
  [/^https:\/\/mahjongsoul\.yo-star\.com\/kr\/classroom/, '작혼 마작 교실'],
  [/^https:\/\/m-league\.jp\//, 'M리그 공식 사이트'],
  [/^https:\/\/gall\.dcinside\.com\//, '디시인사이드 마작 갤러리'],
  [/^https:\/\/news\.livedoor\.com\//, '라이브도어 뉴스'],
];

// sources → 이 사이트 글(공개된 것만)과 바깥 링크
export async function resolveSources(e: GlossaryEntry) {
  const posts = new Map((await getAllPosts()).map(({ board, entry }) => [postUrl(board, entry.id), entry.data.title]));
  const site: { href: string; title: string }[] = [];
  const out: { href: string; name: string }[] = [];
  for (const s of e.sources) {
    if (s.startsWith('/')) {
      const title = posts.get(s);
      if (title) site.push({ href: s, title });
      else console.warn(`[용어 사전] 「${e.id}」의 출처 ${s} 글이 없거나 아직 공개 전이라 뺍니다.`);
    } else if (/^https?:\/\//.test(s)) {
      out.push({ href: s, name: HOSTS.find(([re]) => re.test(s))?.[1] ?? new URL(s).hostname });
    }
  }
  return { site, out };
}
