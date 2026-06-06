import { spawnSync } from "node:child_process";

export interface RunGitOptions {
  cwd?: string;
  allowFailure?: boolean;
  quiet?: boolean;
}

export interface RunGitResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function runGit(args: string[], options: RunGitOptions = {}): RunGitResult {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    // Git can easily print multiple megabytes of output for root commits that
    // create tens of thousands of product snapshot files. Node's default
    // spawnSync maxBuffer is too small for that and reports the command as
    // failed even when Git already created the commit successfully.
    maxBuffer: 64 * 1024 * 1024
  });

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (status !== 0 && !options.allowFailure) {
    const lowLevelError = result.error ? `\n${result.error.name}: ${result.error.message}` : "";
    throw new Error(`git ${args.join(" ")} failed with status ${status}${lowLevelError}\n${stdout}${stderr}`);
  }

  if (!options.quiet && stdout.trim()) process.stdout.write(stdout);
  if (!options.quiet && stderr.trim()) process.stderr.write(stderr);

  return { status, stdout, stderr };
}

export function gitOutput(args: string[], cwd?: string): string {
  return runGit(args, { cwd, quiet: true }).stdout.trim();
}

export function gitSuccess(args: string[], cwd?: string): boolean {
  return runGit(args, { cwd, quiet: true, allowFailure: true }).status === 0;
}
