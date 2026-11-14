import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { remarkPlugins, rehypePlugins } from './src/lib/markdown-plugins.mjs';

export default defineConfig({
  // 배포 주소 (도메인을 연결하면 여기도 바꿔 주세요)
  site: 'https://majakggum.mahjong-iris.workers.dev',
  markdown: {
    // 플러그인 목록은 src/lib/markdown-plugins.mjs (용어 사전도 같은 목록을 씁니다)
    processor: unified({ remarkPlugins, rehypePlugins }),
  },
});
