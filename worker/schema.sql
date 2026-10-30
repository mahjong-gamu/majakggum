-- 댓글 저장소(D1 majakggum-comments) 구조. 이미 만들어져 있고, 새로 만들 때만 씁니다.
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board TEXT NOT NULL,        -- 게시판 (reviews, study, visits, news)
  slug TEXT NOT NULL,         -- 글 파일 이름
  parent_id INTEGER,          -- 답글이면 원래 댓글 id
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,  -- 1 = 마작껌
  pw_hash TEXT,               -- 비밀번호는 PBKDF2 해시로만 저장
  pw_salt TEXT,
  ip_hash TEXT,               -- 연달아 쓰기 막기용 (IP 원문은 저장 안 함)
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER          -- 지운 시각 (값이 있으면 지운 댓글)
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(board, slug, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_recent ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_ip ON comments(ip_hash, created_at);
