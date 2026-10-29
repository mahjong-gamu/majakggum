import { getCollection } from 'astro:content';
import { BOARDS, type BoardKey } from './boards';

export async function getBoardPosts(board: BoardKey) {
  // 임시 저장 글과 예약 시각이 아직 안 된 글은 빼고 빌드합니다
  const now = new Date();
  const items = await getCollection(board, ({ data }) => !data.draft && !(data.publishAt && data.publishAt > now));
  return items
    .map((entry) => ({ board, entry }))
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

export async function getAllPosts() {
  const lists = await Promise.all(BOARDS.map((b) => getBoardPosts(b.key)));
  return lists.flat().sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

export function postUrl(board: string, id: string) {
  return `/${board}/${id}/`;
}
