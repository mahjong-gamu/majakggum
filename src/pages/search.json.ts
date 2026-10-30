// 사이트 검색용 색인: 글마다 제목·요약·본문(마크다운 기호를 뺀 글자)을 담습니다. /search/ 페이지가 읽습니다.
import type { APIRoute } from 'astro';
import { formatDate } from '../lib/boards';
import { getAllPosts, postUrl } from '../lib/posts';

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
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
