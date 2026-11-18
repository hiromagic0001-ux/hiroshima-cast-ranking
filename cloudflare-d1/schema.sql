-- Hiroshima Cast Search shared server storage
-- Run this file once in Cloudflare Dashboard > D1 > database > Console.

CREATE TABLE IF NOT EXISTS app_data (
  data_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_bytes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS refresh_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'failed')),
  store_count_before INTEGER,
  store_count_after INTEGER,
  cast_count_before INTEGER,
  cast_count_after INTEGER,
  source_results_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_refresh_runs_finished_at
  ON refresh_runs (finished_at DESC);
