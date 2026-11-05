// ============================================================================
// DARKTOON AI — Relational Database Engine (src/backend/db/database.ts)
// Uses Node.js built-in node:sqlite DatabaseSync with automatic SQL migration
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let dbInstance: DatabaseSync | null = null;

export function getDbPath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), "storage", "darktoon.sqlite");
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const migrationFile = path.join(
    process.cwd(),
    "migrations",
    "001_initial_schema.sql"
  );
  if (fs.existsSync(migrationFile)) {
    const sql = fs.readFileSync(migrationFile, "utf-8");
    db.exec(sql);
  }

  dbInstance = db;
  return db;
}

export function resetDbForTests(customPath?: string): DatabaseSync {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore close errors
    }
    dbInstance = null;
  }
  if (customPath) {
    process.env.DATABASE_PATH = customPath;
    if (fs.existsSync(customPath)) {
      fs.unlinkSync(customPath);
    }
  }
  return getDb();
}
