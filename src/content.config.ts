import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { TILE_PATTERN } from './lib/tiles.mjs';
import { GLOSSARY_CATEGORIES } from './lib/glossary-meta.mjs';
import { z } from 'astro/zod';

// 모든 게시판 공통 항목
const base = {
  title: z.string(),
  date: z.coerce.date(),
  excerpt: z.string(), // 목록·홈 카드에 보이는 한두 줄 요약
  meta: z.string().optional(), // 날짜 옆에 붙는 짧은 정보 (예: "옥탁 반장전 · 2위")
  cover: z.string().optional(), // 대표 이미지 경로 (예: /images/visits/abc.jpg)
  draft: z.boolean().default(false), // true면 사이트에 안 보임
  publishAt: z.coerce.date().optional(), // 예약 게시 시각 (예: "2026-11-01T20:00:00+09:00") — 이 시각 전에는 사이트에 안 보임
  claude: z.boolean().default(false), // true면 글 맨 아래에 "Claude의 도움을 받아 작성했습니다" 알림이 붙음
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
  hand: z.string().optional(), // 손패 (상대 것) — 안 쓰면 뒷면으로 표시. 내 손패는 moment.hand 에
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
      instagram: z.string().optional(), // 같은 내용의 인스타 카드뉴스 게시물 링크 (마작 뉴스)
    }),
  });

// 용어 사전 (src/data/glossary.yaml). 형식이 틀리면 빌드가 멈춥니다. id 중복·관련 용어 id 확인은 src/lib/glossary.ts 에서 합니다.
const glossary = defineCollection({
  loader: file('./src/data/glossary.yaml'),
  schema: z
    .object({
      id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id 는 영문 소문자·숫자·가운데 줄(-)만 씁니다'),
      term: z.string().min(1),
      ja: z.string(),
      aka: z.array(z.string()),
      category: z.enum(GLOSSARY_CATEGORIES as [string, ...string[]]),
      short: z.string().min(1),
      tiles: z.string().regex(TILE_PATTERN, '패 표기 형식이 아닙니다').nullable(), // 대표 예시 패 (본문과 같은 표기)
      han: z.union([z.object({ closed: z.number(), open: z.number().nullable() }).strict(), z.object({ yakuman: z.literal(true) }).strict()]).nullable(),
      rule_note: z.string().nullable(), // 룰 비교 칸(M리그 기준, 작혼과 다른 점)
      detail: z.string(), // 마크다운
      related: z.array(z.string()),
      sources: z.array(z.string()),
      check: z.boolean(), // true 면 「확인 필요」 표시
    })
    .strict(),
});

export const collections = {
  glossary,
  reviews,
  study: simple('study'),
  visits: simple('visits'),
  news: simple('news'),
};
