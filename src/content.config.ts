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
    // 최종 결과: pt = 포인트 등락 (예: "+45.0", "-12")
    finals: z
      .array(z.object({ rank: z.string(), player: z.string(), score: z.string(), pt: z.string().optional(), me: z.boolean().default(false) }))
      .default([]),
    metrics: z
      .object({
        rating: z.string().optional(), // 레이팅
        match: z.string().optional(), // 일치율
        bad: z.string().optional(), // 악수율
        coach: z.string().optional(), // 빅코치 판단
      })
      .default({}),
    // 국별 흐름 — 한 국에 한 줄
    rounds: z
      .array(
        z.object({
          label: z.string(), // 국 (예: 東1局, 南2局 1本場)
          result: z.enum(['화료', '방총', '타가화료', '유국']),
          how: z.enum(['쯔모', '론']).optional(), // 화료·타가화료일 때
          winner: z.string().optional(), // 화료한 사람 (방총·타가화료일 때)
          from: z.string().optional(), // 방총한 사람 (론 화료일 때)
          draw: z.string().optional(), // 유국 종류 (기본: 황패유국 / 구종구패, 사풍연타, 사가리치, 사깡산개 …)
          tenpai: z.string().optional(), // 황패유국 때 텐파이한 사람 (예: "나, 상대B")
          note: z.string().optional(), // 역·점수 등 짧은 메모 (예: 리치·탕야오·도라2 7700)
          delta: z.string(), // 내 점수 변화
          key: z.boolean().default(false), // true = 주요 국면이 나온 국
        }),
      )
      .default([]),
    // 주요 국면 — 글 하나에 하나
    moment: z
      .object({
        label: z.string(), // 제목 (예: "南2局 8巡 · 리치 판단")
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
        mortalWhy: z.string().optional(), // Mortal의 선택 이유 추정
      })
      .optional(),
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
