import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Fresh SQLite database for tests only (prisma/test.db, git-ignored): delete the
 * file and apply the real migrations. Never touches dev.db or any other database.
 */
export default function setup() {
  for (const f of ["test.db", "test.db-journal"]) rmSync(path.join(__dirname, "..", "prisma", f), { force: true });
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: "file:./test.db" } });
}
