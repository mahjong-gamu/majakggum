// 댓글 API (Cloudflare Worker). 사이트 파일은 assets 가 내보내고, /api/* 만 여기로 옵니다.
//
//   GET    /api/comments?board=&slug=   글 하나의 댓글 목록
//   GET    /api/comments/counts         글마다 댓글 수 { "reviews/2026-10-21-s2": 3, ... }
//   POST   /api/comments                댓글 쓰기 { board, slug, parentId?, name, password, body, turnstile }
//   PATCH  /api/comments/:id            고치기 { password, body }  (마작껌은 password 대신 관리자 토큰)
//   DELETE /api/comments/:id            지우기 { password }
//   POST   /api/admin/login             { password } → { token }  마작껌 확인
//
// 일반 방문자: 닉네임 + 비밀번호(해시로만 저장). 마작껌: ADMIN_PASSWORD 로 받은 토큰을 Authorization 헤더로 보냄.
// 마작껌과 비슷한 이름(RESERVED)은 마작껌만 쓸 수 있습니다.

const BOARDS = ['reviews', 'study', 'visits', 'news'];
const ADMIN_NAME = '마작껌';
const RESERVED = ['마작껌', 'majakggum', 'mahjonggamu', 'gamu', '관리자', '운영자', 'admin'];
const LIMIT = { name: 20, body: 1000, links: 2, pwMin: 4, pwMax: 64, gapMs: 20e3, perDay: 30 };
const PBKDF2_ITER = 100000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (status, message) => json({ error: message }, status);

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function hashPassword(pw, saltHex) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: hex(bits), salt: hex(salt) };
}
// 시간 차로 비교 결과가 새지 않게 끝까지 비교
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// 관리자 토큰 = ADMIN_PASSWORD 로 만든 HMAC. 비밀번호를 바꾸면 예전 토큰은 모두 무효가 됩니다.
async function adminToken(env) {
  if (!env.ADMIN_PASSWORD) return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(env.ADMIN_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('majakggum-admin-v1')));
}
async function isAdmin(req, env) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/);
  const t = await adminToken(env);
  return Boolean(m && t && same(m[1], t));
}

// 공백·기호를 빼고 소문자로 맞춘 뒤 예약어가 들어 있는지 봅니다 ("마작 껌", "마작껌_" 등도 막힘)
const normName = (s) => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}​-‏ㅤᅟᅠ]/gu, '');
const reservedName = (s) => RESERVED.some((r) => normName(s).includes(r));

const clean = (s) => String(s ?? '').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
const linkCount = (s) => (s.match(/https?:\/\/|www\./gi) || []).length;
const validPost = (board, slug) => BOARDS.includes(board) && /^[a-z0-9][a-z0-9-]{0,120}$/i.test(slug || '');

// 실제로 있는 글인지 사이트 파일로 확인
async function postExists(env, url, board, slug) {
  const r = await env.ASSETS.fetch(new Request(new URL(`/${board}/${slug}/`, url), { method: 'HEAD' }));
  return r.ok;
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // 설정 전에는 건너뜀
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = await r.json().catch(() => ({}));
  return Boolean(d.success);
}

async function notifyTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

// 화면에 내보낼 모양 (비밀번호·IP 는 빼고, 지운 댓글은 내용을 비움)
const view = (r) => ({
  id: r.id, parentId: r.parent_id, name: r.deleted_at ? '' : r.name, body: r.deleted_at ? '' : r.body,
  admin: Boolean(r.is_admin), createdAt: r.created_at, updatedAt: r.updated_at, deleted: Boolean(r.deleted_at),
});

async function listComments(env, url) {
  const board = url.searchParams.get('board'), slug = url.searchParams.get('slug');
  if (!validPost(board, slug)) return fail(400, '글 주소가 올바르지 않습니다.');
  const { results } = await env.DB.prepare('SELECT * FROM comments WHERE board = ? AND slug = ? ORDER BY created_at').bind(board, slug).all();
  // 지운 댓글은 살아 있는 답글이 있을 때만 "삭제된 댓글입니다" 자리로 남김
  const alive = new Set(results.filter((r) => !r.deleted_at && r.parent_id).map((r) => r.parent_id));
  return json({ comments: results.filter((r) => !r.deleted_at || alive.has(r.id)).map(view) });
}

async function counts(env) {
  const { results } = await env.DB.prepare('SELECT board, slug, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL GROUP BY board, slug').all();
  return new Response(JSON.stringify(Object.fromEntries(results.map((r) => [`${r.board}/${r.slug}`, r.n]))), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}

async function createComment(req, env, ctx, url) {
  const d = await req.json().catch(() => null);
  if (!d) return fail(400, '요청을 읽지 못했습니다.');
  const board = clean(d.board), slug = clean(d.slug), body = clean(d.body);
  if (!validPost(board, slug)) return fail(400, '글 주소가 올바르지 않습니다.');
  if (!body) return fail(400, '댓글 내용을 적어 주세요.');
  if (body.length > LIMIT.body) return fail(400, `댓글은 ${LIMIT.body}자까지 쓸 수 있습니다.`);
  if (linkCount(body) > LIMIT.links) return fail(400, `링크는 ${LIMIT.links}개까지 넣을 수 있습니다.`);

  const admin = await isAdmin(req, env);
  let name = clean(d.name), pw = null;
  if (admin) name = ADMIN_NAME;
  else {
    if (!name) return fail(400, '닉네임을 적어 주세요.');
    if (name.length > LIMIT.name) return fail(400, `닉네임은 ${LIMIT.name}자까지 쓸 수 있습니다.`);
    if (reservedName(name)) return fail(403, `'${name}' 은(는) 쓸 수 없는 닉네임입니다.`);
    const password = String(d.password ?? '');
    if (password.length < LIMIT.pwMin || password.length > LIMIT.pwMax) return fail(400, `비밀번호는 ${LIMIT.pwMin}~${LIMIT.pwMax}자로 정해 주세요.`);
    pw = await hashPassword(password);
  }

  const ip = req.headers.get('cf-connecting-ip') || '';
  const ipHash = ip ? await sha256(`${ip}|${env.TURNSTILE_SECRET || 'majakggum'}`) : null;
  if (!admin) {
    if (!(await verifyTurnstile(env, d.turnstile, ip))) return fail(403, '스팸 방지 확인에 실패했습니다. 확인 상자를 다시 눌러 주세요.');
    if (ipHash) {
      const now = Date.now();
      const r = await env.DB.prepare('SELECT MAX(created_at) AS last, COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?').bind(ipHash, now - 864e5).first();
      if (r && r.last && now - r.last < LIMIT.gapMs) return fail(429, '조금 뒤에 다시 써 주세요. (댓글 사이 20초)');
      if (r && r.n >= LIMIT.perDay) return fail(429, '오늘은 댓글을 더 쓸 수 없습니다.');
    }
  }
  if (!(await postExists(env, url, board, slug))) return fail(404, '글을 찾지 못했습니다.');

  // 답글은 한 단계만: 답글에 단 답글은 원래 댓글 아래로
  let parentId = d.parentId ? Number(d.parentId) : null;
  if (parentId) {
    const p = await env.DB.prepare('SELECT id, parent_id, board, slug, deleted_at FROM comments WHERE id = ?').bind(parentId).first();
    if (!p || p.board !== board || p.slug !== slug || p.deleted_at) return fail(404, '답글을 달 댓글을 찾지 못했습니다.');
    parentId = p.parent_id || p.id;
  }

  const now = Date.now();
  const row = await env.DB.prepare(
    'INSERT INTO comments (board, slug, parent_id, name, body, is_admin, pw_hash, pw_salt, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
  ).bind(board, slug, parentId, name, body, admin ? 1 : 0, pw?.hash ?? null, pw?.salt ?? null, ipHash, now).first();

  if (!admin) {
    const link = `${url.origin}/${board}/${slug}/#comment-${row.id}`;
    ctx.waitUntil(notifyTelegram(env, `💬 새 ${parentId ? '답글' : '댓글'} — ${name}\n${body.slice(0, 300)}\n\n${link}`));
  }
  return json({ comment: view(row) }, 201);
}

// 고치기·지우기 권한: 마작껌 토큰이거나, 그 댓글의 비밀번호
async function authorize(req, env, row, password) {
  if (await isAdmin(req, env)) return true;
  if (row.is_admin || !row.pw_hash) return false;
  const { hash } = await hashPassword(String(password ?? ''), row.pw_salt);
  return same(hash, row.pw_hash);
}

async function editComment(req, env, id, method) {
  const d = (await req.json().catch(() => null)) || {};
  const row = await env.DB.prepare('SELECT * FROM comments WHERE id = ?').bind(id).first();
  if (!row || row.deleted_at) return fail(404, '댓글을 찾지 못했습니다.');
  if (!(await authorize(req, env, row, d.password))) return fail(403, '비밀번호가 맞지 않습니다.');
  const now = Date.now();
  if (method === 'DELETE') {
    await env.DB.prepare('UPDATE comments SET deleted_at = ? WHERE id = ?').bind(now, id).run();
    return json({ ok: true });
  }
  const body = clean(d.body);
  if (!body) return fail(400, '댓글 내용을 적어 주세요.');
  if (body.length > LIMIT.body) return fail(400, `댓글은 ${LIMIT.body}자까지 쓸 수 있습니다.`);
  if (linkCount(body) > LIMIT.links) return fail(400, `링크는 ${LIMIT.links}개까지 넣을 수 있습니다.`);
  const updated = await env.DB.prepare('UPDATE comments SET body = ?, updated_at = ? WHERE id = ? RETURNING *').bind(body, now, id).first();
  return json({ comment: view(updated) });
}

async function login(req, env) {
  const d = (await req.json().catch(() => null)) || {};
  if (!env.ADMIN_PASSWORD) return fail(503, '관리자 비밀번호가 아직 설정되지 않았습니다.');
  if (!same(String(d.password ?? ''), env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800)); // 마구 넣어 보기를 늦춤
    return fail(403, '관리자 비밀번호가 맞지 않습니다.');
  }
  return json({ token: await adminToken(env), name: ADMIN_NAME });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/api/comments' && req.method === 'GET') return await listComments(env, url);
      if (p === '/api/comments/counts' && req.method === 'GET') return await counts(env);
      if (p === '/api/comments' && req.method === 'POST') return await createComment(req, env, ctx, url);
      const m = p.match(/^\/api\/comments\/(\d+)$/);
      if (m && (req.method === 'PATCH' || req.method === 'DELETE')) return await editComment(req, env, Number(m[1]), req.method);
      if (p === '/api/admin/login' && req.method === 'POST') return await login(req, env);
      if (p.startsWith('/api/')) return fail(404, '없는 주소입니다.');
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e);
      return fail(500, '서버에서 문제가 생겼습니다. 잠시 뒤 다시 해 주세요.');
    }
  },
};
