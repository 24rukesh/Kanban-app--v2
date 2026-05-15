import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data/kanban.sqlite";
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }
  return databaseUrl.slice("file:".length);
}

function ensureDirectoryForDatabase(filePath: string) {
  if (filePath === ":memory:") {
    return;
  }
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
}

const sqlitePath = resolveDatabasePath();
ensureDirectoryForDatabase(sqlitePath);

export const sqlite = new Database(sqlitePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
