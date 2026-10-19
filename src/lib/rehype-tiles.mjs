// 마크다운 본문에서 `3456m234p067s` 처럼 백틱으로 감싼 패 표기를 패 그림으로 바꿉니다.
import { parseTiles, tileSrc, TILE_PATTERN } from './tiles.mjs';

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

function tileNode(t) {
  return { type: 'element', tagName: 'img', properties: { className: ['tile'], src: tileSrc(t), alt: '', width: 60, height: 80 }, children: [] };
}

export default function rehypeTiles() {
  return (tree) => {
    const walk = (node, parent) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'code' && !(node.type === 'element' && node.tagName === 'pre')) {
          const text = textOf(child).trim();
          if (TILE_PATTERN.test(text)) {
            const tiles = parseTiles(text);
            return {
              type: 'element',
              tagName: 'span',
              properties: { className: ['tiles', 'tiles--inline'], role: 'img', ariaLabel: `패 ${tiles.map((t) => t.name).join(' ')}` },
              children: tiles.map(tileNode),
            };
          }
        }
        walk(child, node);
        return child;
      });
    };
    walk(tree, null);
  };
}
