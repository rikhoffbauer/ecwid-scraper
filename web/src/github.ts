import { Octokit } from "@octokit/rest";
import sodium from "libsodium-wrappers-sumo";
import { decodeUtf8Base64, encodeUtf8Base64, stableStringify } from "./json";
import type { AppConfig, RepoSecretSummary, RepoTarget, TreeFile } from "./types";

export class GitHubUiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

export function parseRepository(value: string): Pick<RepoTarget, "owner" | "repo"> {
  const clean = value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
  const [owner, repo, ...rest] = clean.split("/");
  if (!owner || !repo || rest.length > 0) throw new GitHubUiError("Repository must be owner/name");
  return { owner, repo };
}

export function makeOctokit(token: string): Octokit {
  if (!token.trim()) throw new GitHubUiError("GitHub token is required");
  return new Octokit({ auth: token.trim() });
}

export async function getAuthenticatedUser(octokit: Octokit): Promise<string> {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

function assertFileContent(data: unknown, path: string): asserts data is { content: string; sha: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new GitHubUiError(`${path} did not resolve to a file`);
  const record = data as Record<string, unknown>;
  if (typeof record.content !== "string" || typeof record.sha !== "string") throw new GitHubUiError(`${path} has no readable file content`);
}

export async function readTextFile(octokit: Octokit, target: RepoTarget, filePath: string, ref = target.branch): Promise<{ text: string; sha: string }> {
  const { data } = await octokit.rest.repos.getContent({ owner: target.owner, repo: target.repo, path: filePath, ref });
  assertFileContent(data, filePath);
  return { text: decodeUtf8Base64(data.content), sha: data.sha };
}

export async function readJsonFile<T>(octokit: Octokit, target: RepoTarget, filePath: string, ref = target.branch): Promise<{ value: T; sha: string }> {
  const file = await readTextFile(octokit, target, filePath, ref);
  return { value: JSON.parse(file.text) as T, sha: file.sha };
}

export async function writeTextFile(octokit: Octokit, target: RepoTarget, params: { path: string; text: string; message: string; branch?: string }): Promise<string> {
  const branch = params.branch ?? target.branch;
  let sha: string | undefined;
  try { sha = (await readTextFile(octokit, target, params.path, branch)).sha; }
  catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({ owner: target.owner, repo: target.repo, path: params.path, branch, message: params.message, content: encodeUtf8Base64(params.text), sha });
  if (!data.commit.sha) throw new GitHubUiError("GitHub did not return a commit SHA");
  return data.commit.sha;
}

export async function writeJsonFile(octokit: Octokit, target: RepoTarget, params: { path: string; value: unknown; message: string; branch?: string }): Promise<string> {
  return writeTextFile(octokit, target, { ...params, text: stableStringify(params.value) });
}

export async function refCommitSha(octokit: Octokit, target: RepoTarget, ref: string): Promise<string> {
  const normalized = ref.startsWith("refs/") ? ref.replace(/^refs\//, "") : `heads/${ref}`;
  const { data } = await octokit.rest.git.getRef({ owner: target.owner, repo: target.repo, ref: normalized });
  return data.object.sha;
}

export async function branchExists(octokit: Octokit, target: RepoTarget, branch: string): Promise<boolean> {
  try { await refCommitSha(octokit, target, branch); return true; }
  catch (error) { if ((error as { status?: number }).status === 404) return false; throw error; }
}

export async function getCommitTreeSha(octokit: Octokit, target: RepoTarget, ref: string): Promise<string> {
  const sha = await refCommitSha(octokit, target, ref);
  const { data } = await octokit.rest.git.getCommit({ owner: target.owner, repo: target.repo, commit_sha: sha });
  return data.tree.sha;
}

export async function listFiles(octokit: Octokit, target: RepoTarget, ref = target.branch): Promise<TreeFile[]> {
  const treeSha = await getCommitTreeSha(octokit, target, ref);
  const { data } = await octokit.rest.git.getTree({ owner: target.owner, repo: target.repo, tree_sha: treeSha, recursive: "true" });
  return data.tree.filter((item) => item.type === "blob" && typeof item.path === "string" && typeof item.sha === "string").map((item) => ({ path: item.path!, sha: item.sha!, size: item.size ?? undefined, url: item.url ?? undefined })).sort((a, b) => a.path.localeCompare(b.path));
}

export async function getTreeFilesByPath(octokit: Octokit, target: RepoTarget, ref: string): Promise<Map<string, TreeFile>> {
  const files = await listFiles(octokit, target, ref);
  return new Map(files.map((file) => [file.path, file]));
}

export async function readBlobText(octokit: Octokit, target: RepoTarget, blobSha: string): Promise<string> {
  const { data } = await octokit.rest.git.getBlob({ owner: target.owner, repo: target.repo, file_sha: blobSha });
  if (data.encoding !== "base64") throw new GitHubUiError(`Unsupported blob encoding: ${data.encoding}`);
  return decodeUtf8Base64(data.content);
}

export async function readBlobTextByPath(octokit: Octokit, target: RepoTarget, filePath: string, ref: string): Promise<string> {
  const files = await getTreeFilesByPath(octokit, target, ref);
  const file = files.get(filePath);
  if (!file) throw new GitHubUiError(`${filePath} not found on ${ref}`);
  return readBlobText(octokit, target, file.sha);
}

export async function listBranches(octokit: Octokit, target: RepoTarget, prefix = ""): Promise<string[]> {
  const branches = await octokit.paginate(octokit.rest.repos.listBranches, { owner: target.owner, repo: target.repo, per_page: 100 });
  return branches.map((b) => b.name).filter((name) => name.startsWith(prefix)).sort();
}

export async function listRepoSecrets(octokit: Octokit, target: RepoTarget): Promise<RepoSecretSummary[]> {
  const secrets = await octokit.paginate(octokit.rest.actions.listRepoSecrets, { owner: target.owner, repo: target.repo, per_page: 100 });
  return secrets.map((secret) => ({ name: secret.name, created_at: secret.created_at, updated_at: secret.updated_at })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function setRepoSecret(octokit: Octokit, target: RepoTarget, secretName: string, secretValue: string): Promise<void> {
  const name = secretName.trim();
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new GitHubUiError("Secret name must match /^[A-Z_][A-Z0-9_]*$/");
  if (!secretValue) throw new GitHubUiError("Secret value cannot be empty");
  const { data: key } = await octokit.rest.actions.getRepoPublicKey({ owner: target.owner, repo: target.repo });
  await sodium.ready;
  const encryptedBytes = sodium.crypto_box_seal(sodium.from_string(secretValue), sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL));
  await octokit.rest.actions.createOrUpdateRepoSecret({ owner: target.owner, repo: target.repo, secret_name: name, encrypted_value: sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL), key_id: key.key_id });
}

export async function deleteRepoSecret(octokit: Octokit, target: RepoTarget, secretName: string): Promise<void> {
  await octokit.rest.actions.deleteRepoSecret({ owner: target.owner, repo: target.repo, secret_name: secretName });
}

export async function dispatchWorkflow(octokit: Octokit, target: RepoTarget, workflowId: string, inputs: Record<string, string | boolean> = {}, ref = target.branch): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({ owner: target.owner, repo: target.repo, workflow_id: workflowId, ref, inputs });
}

export async function createBranchFrom(octokit: Octokit, target: RepoTarget, branch: string, baseRef = target.branch): Promise<void> {
  if (!/^[A-Za-z0-9._\/-]+$/.test(branch) || branch.includes("..") || branch.startsWith("/") || branch.endsWith("/")) throw new GitHubUiError("Branch name contains unsupported characters");
  if (await branchExists(octokit, target, branch)) throw new GitHubUiError(`Branch already exists: ${branch}`);
  const sha = await refCommitSha(octokit, target, baseRef);
  await octokit.rest.git.createRef({ owner: target.owner, repo: target.repo, ref: `refs/heads/${branch}`, sha });
}

export async function createPullRequest(octokit: Octokit, target: RepoTarget, params: { head: string; title: string; body: string; base?: string }): Promise<{ number: number; htmlUrl: string }> {
  const { data } = await octokit.rest.pulls.create({ owner: target.owner, repo: target.repo, head: params.head, base: params.base ?? target.branch, title: params.title, body: params.body });
  return { number: data.number, htmlUrl: data.html_url };
}

export async function createCommitFromTree(octokit: Octokit, target: RepoTarget, params: { branch: string; message: string; baseTreeSha?: string; parentSha?: string; tree: Array<Record<string, unknown>> }): Promise<string> {
  const { data: tree } = await octokit.rest.git.createTree({ owner: target.owner, repo: target.repo, base_tree: params.baseTreeSha, tree: params.tree as never });
  const { data: commit } = await octokit.rest.git.createCommit({ owner: target.owner, repo: target.repo, message: params.message, tree: tree.sha, parents: params.parentSha ? [params.parentSha] : [] });
  const refName = `heads/${params.branch}`;
  if (params.parentSha) await octokit.rest.git.updateRef({ owner: target.owner, repo: target.repo, ref: refName, sha: commit.sha });
  else await octokit.rest.git.createRef({ owner: target.owner, repo: target.repo, ref: `refs/${refName}`, sha: commit.sha });
  return commit.sha;
}

export async function loadConfig(octokit: Octokit, target: RepoTarget): Promise<AppConfig> {
  const { value } = await readJsonFile<Partial<AppConfig>>(octokit, target, "config/ecwid-stores.json");
  return {
    productsRoot: value.productsRoot ?? "data/stores",
    eventsRoot: value.eventsRoot ?? ".ecwid-sync/events",
    eventBranchPrefix: value.eventBranchPrefix ?? "events/ecwid",
    storeBranchPrefix: value.storeBranchPrefix ?? "stores/ecwid",
    defaultSyncIntervalMinutes: value.defaultSyncIntervalMinutes ?? 30,
    stores: Array.isArray(value.stores) ? value.stores : [],
    $schema: value.$schema
  };
}
