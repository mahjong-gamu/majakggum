// 사이트맵: 검색엔진(네이버·구글)이 모든 글 주소를 찾도록 알려 주는 목록. 빌드할 때 만들어집니다.
import type { APIRoute } from 'astro';
import { BOARDS } from '../lib/boards';
import { getAllPosts, postUrl } from '../lib/posts';
import { GLOSSARY, GLOSSARY_PUBLIC, glossaryUrl, loadGlossary } from '../lib/glossary';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getAllPosts();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const latest = posts[0] ? day(posts[0].entry.data.date) : undefined;
  const urls = [
    { loc: '/', lastmod: latest },
    ...BOARDS.map((b) => ({ loc: `/${b.key}/`, lastmod: posts.find((p) => p.board === b.key) && day(posts.find((p) => p.board === b.key)!.entry.data.date) })),
    ...posts.map(({ board, entry }) => ({ loc: postUrl(board, entry.id), lastmod: day(entry.data.date) })),
  ];
  // 용어 사전은 공개 스위치가 켜졌을 때만
  if (GLOSSARY_PUBLIC) {
    urls.push({ loc: GLOSSARY.path, lastmod: undefined });
    for (const e of (await loadGlossary()).entries) urls.push({ loc: glossaryUrl(e.id), lastmod: undefined });
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.loc, site).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
