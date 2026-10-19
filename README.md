# 마작치는 마작껌

작혼 패보를 Mortal과 함께 복기하는 마작 블로그입니다. [Astro](https://astro.build)로 만든 정적 사이트라 서버나 DB 없이 무료로 배포할 수 있습니다.

## 폴더 구조

```
src/content/reviews/   패보 복기 글 (.md)
src/content/theory/    이론 공부 글
src/content/visits/    마장 탐방 글
src/content/news/      마작 뉴스 글
public/images/         사진 (글에서는 /images/... 로 씀)
templates/             새 글 쓸 때 복사할 양식
src/lib/boards.ts      게시판 이름·소개·색상
src/styles/global.css  전체 색상·글꼴
```

## 글 쓰는 법

1. `templates/` 의 양식을 복사해서 해당 게시판 폴더에 넣습니다.
   - 패보 복기 → `templates/패보복기.md` → `src/content/reviews/`
   - 나머지 → `templates/일반글.md` → `src/content/theory|visits|news/`
2. 파일 이름이 글 주소가 됩니다. 영문·숫자·하이픈 추천 (예: `2026-10-20-e3-push.md` → `/reviews/2026-10-20-e3-push/`).
3. 맨 위 `---` 사이의 항목을 채우고, 그 아래에 본문을 씁니다.
4. 저장해서 GitHub에 올리면 몇 분 뒤 사이트에 반영됩니다.

**예시 글 4개(`(예시)`가 붙은 글)는 실제 글을 쓰면 지워 주세요.**

### 패 표기

`3456m234p067s88p9s` — m=萬, p=筒, s=索, z=자패(1z~7z = 東南西北白發中), 0=적5.
본문에서 백틱(`` ` ``)으로 감싸면 패 그림으로 바뀝니다.

### 임시 저장

맨 위에 `draft: true` 를 넣으면 사이트에 보이지 않습니다.

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
