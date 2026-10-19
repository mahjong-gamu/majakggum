import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeTiles from './src/lib/rehype-tiles.mjs';

export default defineConfig({
  // 배포 주소가 정해지면 바꿔 주세요 (예: https://majakggum.pages.dev)
  site: 'https://majakggum.pages.dev',
  markdown: {
    // 본문에서 `3456m234p` 처럼 백틱으로 감싼 패 표기를 패 그림으로 바꿉니다.
    processor: unified({ rehypePlugins: [rehypeTiles] }),
  },
});
