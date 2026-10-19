import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkCjkFriendly from 'remark-cjk-friendly';
import rehypeTiles from './src/lib/rehype-tiles.mjs';

export default defineConfig({
  // 배포 주소 (도메인을 연결하면 여기도 바꿔 주세요)
  site: 'https://majakggum.mahjong-iris.workers.dev',
  markdown: {
    // remarkCjkFriendly: **日本(일본)**가 처럼 한글·한자 바로 앞뒤의 굵게(**)도 제대로 굵게 표시합니다.
    // rehypeTiles: 본문에서 `3456m234p` 처럼 백틱으로 감싼 패 표기를 패 그림으로 바꿉니다.
    processor: unified({ remarkPlugins: [remarkCjkFriendly], rehypePlugins: [rehypeTiles] }),
  },
});
