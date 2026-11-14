// 사이트 검색용 색인: 글마다 제목·요약·본문(마크다운 기호를 뺀 글자)을 담습니다. /search/ 페이지가 읽습니다.
import type { APIRoute } from 'astro';
import { formatDate } from '../lib/boards';
import { getAllPosts, postUrl } from '../lib/posts';
import { GLOSSARY_PUBLIC, glossaryUrl, loadGlossary } from '../lib/glossary';

const plain = (md = '') =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const items = posts.map(({ board, entry }) => {
    const d = entry.data;
    return { b: board, u: postUrl(board, entry.id), t: d.title, e: d.excerpt, m: d.meta ?? '', d: formatDate(d.date), x: plain(entry.body) };
  });
  // 용어 사전은 공개 스위치가 켜졌을 때만 색인에 넣습니다 (k = 일본어·다른 이름: 찾는 데만 쓰고 화면에는 안 보임)
  if (GLOSSARY_PUBLIC) {
    const { entries } = await loadGlossary();
    for (const e of entries) items.push({ b: 'glossary', u: glossaryUrl(e.id), t: e.term, e: e.short, m: e.category, d: '', x: plain(e.detail), k: [e.ja, ...e.aka].join(' ') } as any);
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
