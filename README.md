# 마작치는 마작껌

작혼 패보를 Mortal과 함께 복기하는 마작 블로그입니다. [Astro](https://astro.build)로 만든 정적 사이트라 서버나 DB 없이 무료로 배포할 수 있습니다.

## 폴더 구조

```
src/content/reviews/   패보 복기 글 (.md)
src/content/study/    마작 공부 글
src/content/visits/    마장 탐방 글
src/content/news/      마작 뉴스 글
public/images/         사진 (글에서는 /images/... 로 씀)
public/tiles/          마작패 그림 (SVG)
scripts/gen-tiles.mjs  마작패 그림을 만드는 스크립트
templates/             새 글 쓸 때 복사할 양식
src/lib/boards.ts      게시판 이름·소개·색상
src/styles/global.css  전체 색상·글꼴
```

## 글 쓰는 법

1. `templates/` 의 양식을 복사해서 해당 게시판 폴더에 넣습니다.
   - 패보 복기 → `templates/패보복기.md` → `src/content/reviews/`
   - 나머지 → `templates/일반글.md` → `src/content/study|visits|news/`
2. 파일 이름이 글 주소가 됩니다. 영문·숫자·하이픈 추천 (예: `2026-10-20-e3-push.md` → `/reviews/2026-10-20-e3-push/`).
3. 맨 위 `---` 사이의 항목을 채우고, 그 아래에 본문을 씁니다.
4. 저장해서 GitHub에 올리면 몇 분 뒤 사이트에 반영됩니다.

### 패 표기

`3456m234p067s88p9s` — m=萬, p=筒, s=索, z=자패(1z~7z = 東南西北白發中), 0=적5.
본문에서 백틱(`` ` ``)으로 감싸면 패 그림으로 바뀝니다.

패 그림은 `public/tiles/` 의 SVG 파일(`1m.svg` … `7z.svg`, `0m/0p/0s.svg` = 적5, `back.svg` = 뒷면)입니다.
`scripts/gen-tiles.mjs` 로 만든 것이라, 색이나 모양을 바꾸려면 그 파일을 고친 뒤 `npm run tiles` 를 실행하세요.

### 임시 저장

맨 위에 `draft: true` 를 넣으면 사이트에 보이지 않습니다.

### 뉴스 대표 이미지 (자동)

마작 뉴스 글을 `main` 에 올리면 GitHub Actions(`.github/workflows/news-cover.yml`)가 Cloudflare Workers AI(FLUX.2 klein 4B, 무료 사용량 안)로 기사 분위기에 맞는 대표 이미지를 만들고, `public/images/news/<글이름>.webp` 저장과 머리말 `cover:` 추가까지 해서 다시 커밋합니다. 몇 분 뒤 사이트에 이미지가 붙습니다.

- 이미 `cover` 가 있거나 `draft: true`, `autoCover: false` 인 글은 건너뜁니다.
- 장면은 기사를 읽고 자동으로 정합니다. 직접 정하려면 머리말에 `coverPrompt: "영어로 장면 한두 문장"` 을 적습니다.
- 모든 이미지에는 같은 스타일(사이트 초록·크림·주홍)과 금지 목록이 붙습니다: 글자·숫자, 실존 인물·얼굴, 로고·캐릭터, 돈·칩·도박, 패 클로즈업.
- 만든 뒤에는 이미지를 보는 모델이 **검사**합니다: 글자·얼굴·로고·돈/도박(큰 문제), 일그러짐·패 클로즈업·기사와 다른 분위기(가벼운 문제). 문제가 있으면 그 내용을 프롬프트에 넣어 다시 만들고(최대 3번), 큰 문제가 끝까지 남으면 이미지를 붙이지 않습니다. 검사 결과도 `scripts/cover-prompts.json` 에 남습니다.
- 기본 분위기는 밝고 따뜻하게, 사람은 되도록 빼거나 아주 작은 실루엣으로 둡니다. 파일은 webp 로 압축합니다(보통 100~250KB).
- **연결·품질 시험**: Actions → "뉴스 대표 이미지" → Run workflow 에서 `test` 를 켜면 글은 바꾸지 않고, 시도한 이미지들과 검사 결과(`report.json`)를 실행 기록의 Artifacts 로 받을 수 있습니다.
- 쓴 프롬프트는 `scripts/cover-prompts.json` 에 남습니다.
- 이미지가 마음에 안 들면: GitHub → Actions → "뉴스 대표 이미지" → Run workflow → 글 이름을 넣고 `force` 를 켜서 다시 만듭니다.
- 비밀값: 저장소 Settings → Secrets and variables → Actions 에 `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN`(Workers AI 권한 토큰).
- 무료 사용량: 하루 1만 Neurons(한국 시간 오전 9시에 새로 채워짐). 이미지 한 장에 수백 Neurons 정도라 하루 몇 장은 충분합니다.

내 컴퓨터에서 직접 만들 때는 저장소 맨 위에 `.env` 파일(Git에 올라가지 않음)을 두고:

```
CLOUDFLARE_ACCOUNT_ID=계정ID
CLOUDFLARE_AI_TOKEN=토큰
```

그다음:

```bash
npm run cover                        # cover 없는 뉴스 글 전부
npm run cover -- 2026-10-22-글이름    # 이 글만
npm run cover -- 2026-10-22-글이름 --force   # 다시 만들기
npm run cover -- --dry               # 이미지 없이 프롬프트만 보기
```

## 내 컴퓨터에서 미리 보기

[Node.js](https://nodejs.org) 22.22 이상이 필요합니다.

```bash
npm install      # 처음 한 번
npm run dev      # http://localhost:4321 에서 확인 (저장하면 바로 반영)
npm run build    # 배포용 결과물 만들기 (dist/ 폴더)
```

## 배포 (Cloudflare)

- 주소: https://majakggum.mahjong-iris.workers.dev
- GitHub 저장소: https://github.com/mahjong-gamu/majakggum
- Cloudflare 대시보드 → Compute (Workers & Pages) → `majakggum` 에서 빌드 기록을 볼 수 있습니다.
- 빌드 설정: Build command `npm run build`, 결과물 폴더 `dist`. Node 버전은 `.node-version` 파일(22.22.0)로 지정되어 있습니다.
- 도메인을 바꾸면 `astro.config.mjs` 의 `site` 값도 같이 바꿔 주세요.

GitHub의 `main` 브랜치에 글을 올리면 자동으로 다시 배포됩니다.
