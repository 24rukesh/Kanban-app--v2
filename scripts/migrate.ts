import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

function resolveDatabasePath(): string {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data/kanban.sqlite";
  return databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;
}

function ensureDirectory(dbPath: string) {
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);
  const directoryPath = path.dirname(absolutePath);
  fs.mkdirSync(directoryPath, { recursive: true });
  return absolutePath;
}

function run() {
  const drizzleDirPath = path.resolve(process.cwd(), "drizzle");
  const sqlFiles = fs
    .readdirSync(drizzleDirPath)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const dbPath = ensureDirectory(resolveDatabasePath());
  const sqlite = new Database(dbPath);
  try {
    for (const fileName of sqlFiles) {
      const sqlFilePath = path.resolve(drizzleDirPath, fileName);
      const sql = fs.readFileSync(sqlFilePath, "utf8");
      const statements = sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        try {
          sqlite.exec(`${statement};`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message.toLowerCase() : "";
          const ignorable =
            message.includes("duplicate column name") ||
            message.includes("already exists");
          if (!ignorable) {
            throw error;
          }
        }
      }
      console.log(`Migration applied: ${sqlFilePath}`);
    }
  } finally {
    sqlite.close();
  }
}

run();
