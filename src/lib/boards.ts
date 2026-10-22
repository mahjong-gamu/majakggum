// 게시판 정의. 탭 순서, 이름, 소개 문구, 색상(게시판별, 디자인 톤에 맞춘 옅은 바탕 + 짙은 글자), 대표 패(wind)를 여기서 바꿀 수 있습니다.
// wind 는 패 표기(1z=東 2z=南 3z=西 4z=北 …)입니다.
export const BOARDS = [
  {
    key: 'reviews',
    label: '패보 복기',
    short: '작혼 패보를 Mortal로 다시 보고 판단 이유를 남깁니다.',
    desc: '제가 친 작혼 대국을 Mortal 리뷰와 함께 다시 봅니다. 주요 국면마다 대국 중 생각과 AI의 판단, 복기 후 생각을 나란히 기록합니다.',
    tint: '#D4E9E2',
    ink: '#006241',
    wind: '1z',
  },
  {
    key: 'study',
    label: '마작 공부',
    short: '전술서·자료·AI로 공부한 내용을 정리해 나눕니다.',
    desc: '마작 전술서와 여러 자료, Mortal 같은 AI를 보며 공부한 내용을 정리해 나누는 곳입니다. 입문 설명서부터 리치 판단, 수비, 점수 상황별 전략까지 함께 공부해요.',
    tint: '#D3DCE9',
    ink: '#1C4A86',
    wind: '2z',
  },
  {
    key: 'visits',
    label: '마장 탐방',
    short: '직접 다녀온 오프 마장 이야기.',
    desc: '직접 가본 오프 마장의 분위기, 룰과 요금, 찾아가는 길을 기록합니다.',
    tint: '#E9DCD3',
    ink: '#8A4318',
    wind: '3z',
  },
  {
    key: 'news',
    label: '마작 뉴스',
    short: '대회, 작혼, 마작 AI 소식과 짧은 코멘트.',
    desc: '대회 소식, 작혼 업데이트, 마작 AI 관련 소식을 요약하고 제 코멘트를 붙입니다. 원문 링크는 항상 함께 둡니다.',
    tint: '#E0D3E8',
    ink: '#5A3680',
    wind: '4z',
  },
] as const;

export type BoardKey = (typeof BOARDS)[number]['key'];

export function getBoard(key: string) {
  const b = BOARDS.find((x) => x.key === key);
  if (!b) throw new Error(`알 수 없는 게시판: ${key}`);
  return b;
}

export function formatDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}
