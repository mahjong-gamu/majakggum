// 예약 게시: 글 맨 위의 publishAt 시각이 지났으면 그 줄을 지웁니다.
// GitHub Actions(.github/workflows/scheduled-publish.yml)가 15분마다 실행하고,
// 바뀐 파일이 있으면 커밋 → Cloudflare가 다시 빌드해서 글이 사이트에 나타납니다.
// 공개한 글 제목은 한 줄에 하나씩 출력합니다 (커밋 메시지에 씀).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/content';
const now = Date.now();

function* mdFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* mdFiles(p);
    else if (e.name.endsWith('.md')) yield p;
  }
}

for (const file of mdFiles(ROOT)) {
  const text = readFileSync(file, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  const line = fm[1].match(/^publishAt:\s*["']?([^"'#\r\n]+?)["']?\s*(#.*)?$/m);
  if (!line) continue;
  const at = Date.parse(line[1]);
  if (Number.isNaN(at)) { console.error(`${file}: publishAt 시각을 읽을 수 없습니다 (${line[1]})`); continue; }
  if (at > now) continue;
  const head = fm[0].replace(new RegExp(`^${line[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n`, 'm'), '');
  writeFileSync(file, head + text.slice(fm[0].length));
  const title = fm[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? file;
  console.log(title);
}
