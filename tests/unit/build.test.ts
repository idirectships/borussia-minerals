/**
 * Build verification tests.
 * Checks TypeScript type correctness across src/.
 *
 * The .next/ directory contains Next.js-generated validator files that
 * reference routes that may have been deleted. We exclude them from the
 * tsc check via a temporary tsconfig rather than running tsc on the full
 * project (which includes stale .next/types generated from deleted routes).
 */

import { describe, it, expect } from "vitest";
import { execFileSync, execSync } from "child_process";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(__dirname, "../..");

describe("TypeScript type check", () => {
  it("src/ has no TypeScript errors (excluding .next generated types)", { timeout: 90_000 }, () => {
    // Write a temp tsconfig that scopes to src/ only, ignoring .next/ cache
    const tempConfig = {
      extends: "./tsconfig.json",
      include: ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts"],
      exclude: ["node_modules", ".next"],
    };
    const tempConfigPath = path.join(ROOT, "tsconfig.test-check.json");
    fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

    let output = "";
    let exitCode = 0;
    try {
      output = execFileSync("npx", ["tsc", "--noEmit", "--project", "tsconfig.test-check.json"], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 60_000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; status?: number };
      output = (e.stdout ?? "") + (e.stderr ?? "");
      exitCode = e.status ?? 1;
    } finally {
      // Always clean up the temp config
      try { fs.unlinkSync(tempConfigPath); } catch { /* ignore */ }
    }

    const errorLines = output
      .split("\n")
      .filter((l) => l.includes("error TS"));

    if (errorLines.length > 0) {
      console.error("TypeScript errors found:\n" + errorLines.join("\n"));
    }

    expect(exitCode, `tsc exited with code ${exitCode}:\n${output}`).toBe(0);
    expect(errorLines, `TypeScript error lines:\n${errorLines.join("\n")}`).toHaveLength(0);
  });
});
