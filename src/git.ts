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
    encoding: "utf8"
  });

  const status = result.status ?? 1;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (status !== 0 && !options.allowFailure) {
    throw new Error(`git ${args.join(" ")} failed with status ${status}\n${stdout}${stderr}`);
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
