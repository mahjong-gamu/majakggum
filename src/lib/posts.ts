import { getCollection } from 'astro:content';
import { BOARDS, type BoardKey } from './boards';

export async function getBoardPosts(board: BoardKey) {
  const items = await getCollection(board, ({ data }) => !data.draft);
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
