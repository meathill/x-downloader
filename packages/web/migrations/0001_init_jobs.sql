CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  filename TEXT,
  format TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  error TEXT,
  log_excerpt TEXT,
  r2_key TEXT,
  r2_url TEXT,
  worker_id TEXT
);

CREATE INDEX IF NOT EXISTS jobs_created_idx ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_url_idx ON jobs(url);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
