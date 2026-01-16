import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type DownloadStatus = "queued" | "running" | "done" | "failed";

const DATA_DIR = "data";
const DB_FILENAME = "x-downloader.db";

function ensureDataDir(): string {
  const overrideDir = process.env.X_DOWNLOADER_DATA_DIR;
  const baseDir = overrideDir ? path.resolve(overrideDir) : path.join(process.cwd(), DATA_DIR);
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

export function getDatabase(): Database.Database {
  const globalStore = globalThis as { __xDownloaderDb?: Database.Database };
  if (globalStore.__xDownloaderDb) {
    return globalStore.__xDownloaderDb;
  }

  const dataDir = ensureDataDir();
  const dbPath = process.env.X_DOWNLOADER_DB_PATH
    ? path.resolve(process.env.X_DOWNLOADER_DB_PATH)
    : path.join(dataDir, DB_FILENAME);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      filename TEXT,
      format TEXT,
      output_path TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      finished_at INTEGER,
      error TEXT,
      logs TEXT
    );
    CREATE INDEX IF NOT EXISTS downloads_status_idx ON downloads(status);
    CREATE INDEX IF NOT EXISTS downloads_created_idx ON downloads(created_at);
  `);

  ensureColumn(db, "output_path", "TEXT");

  globalStore.__xDownloaderDb = db;
  return db;
}

function ensureColumn(db: Database.Database, name: string, definition: string): void {
  const columns = db.prepare("PRAGMA table_info(downloads)").all() as Array<{ name: string }>;
  const exists = columns.some((column) => column.name === name);
  if (exists) {
    return;
  }

  db.exec(`ALTER TABLE downloads ADD COLUMN ${name} ${definition}`);
}
