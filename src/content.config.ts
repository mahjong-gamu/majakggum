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

// 사람은 닉네임 대신 동1국 기준 자리로 적습니다
const seatName = z.enum(['동가', '남가', '서가', '북가']);

// 후로(울기) 한 묶음: "456p" 처럼 패만 적거나,
// { tiles: "456p", called: 1 } — called = 옆으로 눕힐(가져온) 패의 순서(1부터)
// { tiles: "5555m", closed: true } — 안깡(양끝을 뒷면으로)
const meld = z.union([
  z.string(),
  z.object({ tiles: z.string(), called: z.number().int().optional(), closed: z.boolean().default(false) }),
]);

const tablePlayer = z.object({
  score: z.union([z.string(), z.number()]), // 그 시점 점수
  river: z.string().default(''), // 버림패 (순서대로)
  riichi: z.number().int().optional(), // 리치 선언패가 버림패 중 몇 번째인지 (1부터) — 옆으로 눕혀 표시
  melds: z.array(meld).default([]), // 후로패
});

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
  schema: z.object({
    ...base,
    hand: z.string().optional(), // 카드에 보일 대표 손패
    majsoul: z.string().optional(), // 작혼 패보 링크
    mortal: z.string().optional(), // Mortal 리뷰 원본 링크
    myseat: seatName, // 내 자리 (동1국 기준)
    // 최종 결과 (순위대로): pt = 포인트 등락 (예: "+45.0", "-12")
    finals: z
      .array(z.object({ rank: z.string(), seat: seatName, score: z.string(), pt: z.string().optional() }))
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
          kyoku: z.string(), // 국 (예: 동1, 남4) → "동1국 0본장" 으로 표시
          honba: z.number().int().default(0), // 본장
          result: z.enum(['화료', '방총', '타가화료', '유국']),
          how: z.enum(['쯔모', '론']).optional(), // 화료·타가화료일 때
          winner: seatName.optional(), // 화료한 사람 (방총·타가화료일 때)
          from: seatName.optional(), // 방총한 사람 (론 화료일 때)
          draw: z.string().optional(), // 유국 종류 (기본: 황패유국 / 구종구패, 사풍연타, 사가리치, 사깡산개 …)
          tenpai: z.string().optional(), // 황패유국 때 텐파이한 사람 (예: "남가, 서가" / "전원 노텐")
          note: z.string().optional(), // 역·점수 등 짧은 메모 (예: 리치·탕야오·도라2 7700)
          delta: z.string(), // 내 점수 변화
          key: z.boolean().default(false), // true = 주요 국면이 나온 국
        }),
      )
      .default([]),
    // 주요 국면 — 글 하나에 하나
    moment: z
      .object({
        kyoku: z.string(), // 국 (예: 남4)
        honba: z.number().int().default(0), // 본장
        kyotaku: z.number().int().default(0), // 공탁 (리치봉 수)
        turn: z.number().int().optional(), // 순목
        title: z.string(), // 국면 제목 (예: 리치 판단)
        situation: z.string().optional(), // 한 줄 상황 설명
        dora: z.string().default(''), // 도라 표시패 (여러 장이면 이어서: 4m7p)
        // 자리별 점수·버림패·후로 (동1국 기준 자리로)
        players: z
          .object({ 동가: tablePlayer.optional(), 남가: tablePlayer.optional(), 서가: tablePlayer.optional(), 북가: tablePlayer.optional() })
          .default({}),
        hand: z.string(), // 내 손패
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
