import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { runGit } from "../src/git.ts";

describe("git helper", () => {
  test("captures large git output without treating a successful command as failed", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ecwid-git-buffer-"));
    runGit(["init"], { cwd: dir, quiet: true });

    const payload = "x".repeat(2 * 1024 * 1024);
    const filePath = path.join(dir, "large.txt");
    await writeFile(filePath, payload, "utf8");

    const objectHash = runGit(["hash-object", "-w", "large.txt"], { cwd: dir, quiet: true }).stdout.trim();
    const output = runGit(["cat-file", "-p", objectHash], { cwd: dir, quiet: true });

    expect(output.status).toBe(0);
    expect(output.stdout.length).toBe(payload.length);
    expect(output.stdout).toBe(payload);
  });
});
