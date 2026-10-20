// 마크다운 본문에서 `3456m234p067s` 처럼 백틱으로 감싼 패 표기를 패 그림으로 바꿉니다.
// 문단에 패 표기 하나만 있으면 크게 한 줄로 보여 줍니다 (손패 예시용).
// 확장 표기(옆으로 눕힘 ^, 겹침 ^^, 뒷면 #, 띄어쓰기 간격)는 tiles.mjs 참고.
import { parseTileGroups, tileSrc, TILE_PATTERN } from './tiles.mjs';

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

function img(t) {
  return { type: 'element', tagName: 'img', properties: { className: ['tile'], src: tileSrc(t), alt: '', width: 60, height: 78 }, children: [] };
}

function tileNode(t) {
  if (!t.side) return img(t);
  const inner = t.stack ? [img(t), img(t)] : [img(t)];
  return { type: 'element', tagName: 'span', properties: { className: ['tile-side', ...(t.stack ? ['tile-side--stack'] : [])] }, children: inner };
}

function label(groups) {
  return `패 ${groups.map((g) => g.map((t) => (t.side ? `${t.name}(${t.stack ? '가깡' : '울어 온 패'})` : t.name)).join(' ')).join(', ')}`;
}

function tilesElement(text, block) {
  const groups = parseTileGroups(text);
  return {
    type: 'element',
    tagName: block ? 'div' : 'span',
    properties: { className: ['tiles', block ? 'tiles--block' : 'tiles--inline'], role: 'img', ariaLabel: label(groups) },
    children: groups.map((g) => ({ type: 'element', tagName: 'span', properties: { className: ['tile-grp'] }, children: g.map(tileNode) })),
  };
}

function isTileCode(node) {
  return node.type === 'element' && node.tagName === 'code' && TILE_PATTERN.test(textOf(node).trim());
}

export default function rehypeTiles() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        // 패 표기만 있는 문단 → 큰 한 줄
        if (child.type === 'element' && child.tagName === 'p') {
          const kids = child.children.filter((k) => !(k.type === 'text' && !k.value.trim()));
          if (kids.length === 1 && isTileCode(kids[0])) return tilesElement(textOf(kids[0]).trim(), true);
        }
        if (isTileCode(child) && !(node.type === 'element' && node.tagName === 'pre')) {
          return tilesElement(textOf(child).trim(), false);
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}
