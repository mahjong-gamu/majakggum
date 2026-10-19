// 국·자리 계산 도우미
export const SEATS = ['동가', '남가', '서가', '북가'] as const;
export type Seat = (typeof SEATS)[number];
const WINDS = ['동', '남', '서', '북'];
const HANJA: Record<string, string> = { 東: '동', 南: '남', 西: '서', 北: '북' };

// "남4" / "南4" → { wind: '남', num: 4 }
export function parseKyoku(kyoku: string) {
  const k = kyoku.trim();
  const wind = HANJA[k[0]] ?? k[0];
  const num = Number.parseInt(k.slice(1), 10) || 1;
  return { wind, num };
}

// "남4", 1 → "남4국 1본장"
export function kyokuLabel(kyoku: string, honba = 0) {
  const { wind, num } = parseKyoku(kyoku);
  return `${wind}${num}국 ${honba}본장`;
}

// 그 국에서 해당 자리(동1국 기준)의 자풍. N국의 오야는 동1국 기준 N번째 자리입니다.
export function seatWind(seat: Seat, kyoku: string) {
  const { num } = parseKyoku(kyoku);
  const i = SEATS.indexOf(seat);
  return WINDS[(((i - (num - 1)) % 4) + 4) % 4];
}

// 내 자리 기준 위치: 아래(나) → 오른쪽(하가) → 위(대가) → 왼쪽(상가)
export function seatsAround(me: Seat) {
  const i = SEATS.indexOf(me);
  return {
    bottom: SEATS[i],
    right: SEATS[(i + 1) % 4],
    top: SEATS[(i + 2) % 4],
    left: SEATS[(i + 3) % 4],
  };
}

// 내 닉네임 — 내 자리 옆에 "(마작껌)"처럼 붙습니다
export const MY_NAME = '마작껌';
export const withMe = (seat: string | undefined, me: string) => (seat === me ? `${seat}(${MY_NAME})` : seat ?? '');

export function formatScore(v: string | number) {
  return typeof v === 'number' ? v.toLocaleString('en-US') : v;
}
