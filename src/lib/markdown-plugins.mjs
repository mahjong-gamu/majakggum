// 본문(마크다운)을 그리는 플러그인 목록. astro.config.mjs(글)와 용어 사전(src/lib/glossary.ts)이 같은 목록을 씁니다.
// remarkCjkFriendly: **日本(일본)**가 처럼 한글·한자 바로 앞뒤의 굵게(**)도 제대로 굵게 표시합니다.
// rehypeTiles: 백틱으로 감싼 패 표기(`3456m234p`)를 패 그림으로 바꿉니다.
import remarkCjkFriendly from 'remark-cjk-friendly';
import rehypeTiles from './rehype-tiles.mjs';

export const remarkPlugins = [remarkCjkFriendly];
export const rehypePlugins = [rehypeTiles];
