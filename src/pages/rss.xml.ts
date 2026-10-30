// RSS: 새 글 알림 구독용 목록(최근 30개). 네이버 서치어드바이저에도 제출할 수 있습니다.
import type { APIRoute } from 'astro';
import { getBoard } from '../lib/boards';
import { getAllPosts, postUrl } from '../lib/posts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getAllPosts()).slice(0, 30);
  const home = new URL('/', site).href;
  const items = posts.map(({ board, entry }) => {
    const url = new URL(postUrl(board, entry.id), site).href;
    return `    <item>
      <title>${esc(entry.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${entry.data.date.toUTCString()}</pubDate>
      <category>${esc(getBoard(board).label)}</category>
      <description>${esc(entry.data.excerpt)}</description>
    </item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>마작치는 마작껌</title>
    <link>${home}</link>
    <description>작혼 패보를 Mortal과 함께 다시 보는 마작 블로그. 패보 복기, 마작 공부, 마장 탐방, 마작 뉴스.</description>
    <language>ko</language>
    <atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
