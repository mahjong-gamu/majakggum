import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 모든 게시판 공통 항목
const base = {
  title: z.string(),
  date: z.coerce.date(),
  excerpt: z.string(), // 목록·홈 카드에 보이는 한두 줄 요약
  meta: z.string().optional(), // 날짜 옆에 붙는 짧은 정보 (예: "옥의 간 반장전 · 2위")
  cover: z.string().optional(), // 대표 이미지 경로 (예: /images/visits/abc.jpg)
  draft: z.boolean().default(false), // true면 사이트에 안 보임
};

const seat = z.object({ player: z.string(), score: z.string(), me: z.boolean().default(false) });

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
  schema: z.object({
    ...base,
    hand: z.string().optional(), // 카드에 보일 대표 손패
    majsoul: z.string().optional(), // 작혼 패보 링크
    mortal: z.string().optional(), // Mortal 리뷰 원본 링크
    finals: z.array(z.object({ rank: z.string(), player: z.string(), score: z.string(), me: z.boolean().default(false) })).default([]),
    metrics: z
      .object({
        match: z.string().optional(), // Mortal 일치율
        rating: z.string().optional(),
        mismatches: z.string().optional(), // 불일치 선택 수
        blunders: z.string().optional(), // 큰 실수 수
      })
      .default({}),
    rounds: z.array(z.object({ label: z.string(), result: z.string(), delta: z.string(), key: z.boolean().default(false) })).default([]),
    moments: z
      .array(
        z.object({
          label: z.string(), // 탭 이름 (예: "南2局 8巡 · 리치 판단")
          situation: z.string().optional(),
          dora: z.string().optional(), // 도라 표시패 (예: 4m)
          seats: z.array(seat).default([]),
          river: z.string().optional(), // 내 버림패
          hand: z.string(), // 손패 13장
          draw: z.string().optional(), // 쯔모패
          candidates: z
            .array(z.object({ action: z.string(), prob: z.number(), pick: z.enum(['ai', 'me', 'both', 'other']).default('other') }))
            .default([]),
          why: z.string().optional(), // 대국 중 내 판단
          after: z.string().optional(), // 복기 후 생각
        }),
      )
      .default([]),
  }),
});

const simple = (dir: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${dir}` }),
    schema: z.object({
      ...base,
      source: z.string().optional(), // 뉴스 원문 링크
      place: z.string().optional(), // 마장 주소·위치
    }),
  });

export const collections = {
  reviews,
  theory: simple('theory'),
  visits: simple('visits'),
  news: simple('news'),
};
