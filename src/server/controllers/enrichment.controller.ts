import {
  applyAcceptedProposals,
  CommandEnrichmentAgentHarness,
  listEnrichmentProposals,
  OpenAICompatibleEmbeddingProvider,
  parseAgentCommand,
  setProposalReviewState,
  updateEmbeddingsAndCandidates,
} from "../enrichment.ts";
import path from "node:path";
import { rm } from "node:fs/promises";
import type { OperationsDatabase } from "../operations/database.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createEnrichmentRoutes(db: OperationsDatabase) {
  return {
    "/api/enrichment/runs": {
      GET(req: Request) {
        return json(db.listEnrichmentRuns());
      },
      async POST(req: Request) {
        const input = (await req.json().catch(() => ({}))) as {
          runId?: string;
          embeddingProviderId?: number;
          embeddingModel?: string;
          minimumEmbeddingScore?: number;
        };
        const runId = input.runId?.trim() || `enrichment-${Date.now()}`;
        const harness = new CommandEnrichmentAgentHarness({ command: ["true"] });
        let embeddingCandidates = 0;
        if (
          input.embeddingProviderId ||
          process.env.ENRICHMENT_EMBEDDING_PROVIDER_ID
        ) {
          const provider = db.llmProvider(
            Number(
              input.embeddingProviderId ??
                process.env.ENRICHMENT_EMBEDDING_PROVIDER_ID,
            ),
          );
          if (!provider)
            return json({ error: "embedding provider not found" }, 400);
          embeddingCandidates = await updateEmbeddingsAndCandidates(
            db,
            new OpenAICompatibleEmbeddingProvider({
              provider: provider.provider,
              configJson: provider.configJson,
              model:
                input.embeddingModel ??
                process.env.ENRICHMENT_EMBEDDING_MODEL ??
                provider.model,
              name: provider.name,
            }),
            input.minimumEmbeddingScore ??
              Number(process.env.ENRICHMENT_EMBEDDING_MINIMUM_SCORE ?? 0.65),
          );
        }
        const workspace = harness.prepare(runId);
        harness.exportSourceData(workspace, db);
        db.createEnrichmentRun({
          id: runId,
          harness: "command",
          artifactPath: workspace.databasePath,
        });
        return json(
          {
            runId,
            databasePath: workspace.databasePath,
            embeddingCandidates,
            validationErrors: harness.validate(workspace),
          },
          201,
        );
      }
    },
    "/api/enrichment/runs/:id": {
      async DELETE(req: Request & { params: { id: string } }) {
        const runId = decodeURIComponent(req.params.id);
        const artifactPath = db.deleteEnrichmentRun(runId);
        if (!artifactPath) return json({ error: "not found" }, 404);
        await rm(path.dirname(artifactPath), { recursive: true, force: true });
        return json({ removed: true });
      }
    },
    "/api/enrichment/runs/:id/execute": {
      async POST(req: Request & { params: { id: string } }) {
        const runId = decodeURIComponent(req.params.id);
        const run = db
          .listEnrichmentRuns()
          .find((item: any) => item.id === runId) as
          | Record<string, unknown>
          | undefined;
        if (!run?.artifact_path) return json({ error: "not found" }, 404);
        const command = process.env.ENRICHMENT_AGENT_COMMAND
          ? parseAgentCommand(process.env.ENRICHMENT_AGENT_COMMAND)
          : [];
        if (!command?.length)
          return json(
            { error: "ENRICHMENT_AGENT_COMMAND is not configured" },
            409,
          );
        const workspace = {
          runId,
          directory: path.dirname(String(run.artifact_path)),
          databasePath: String(run.artifact_path),
          instructionsPath: path.join(
            path.dirname(String(run.artifact_path)),
            "instructions.md",
          ),
        };
        const harness = new CommandEnrichmentAgentHarness({
          command,
          root: path.dirname(workspace.directory),
          timeoutMs: Number(process.env.ENRICHMENT_AGENT_TIMEOUT_MS ?? 300_000),
        });
        db.setEnrichmentRunStatus(runId, "running");
        const result = await harness.runWithRepair(
          workspace,
          Number(process.env.ENRICHMENT_AGENT_MAX_REPAIRS ?? 1),
        );
        db.setEnrichmentRunStatus(
          runId,
          result.validationErrors.length || result.code !== 0
            ? "invalid"
            : "completed",
          result.validationErrors.join("\n") ||
            (result.code !== 0 ? result.stderr : undefined),
        );
        return json(
          result,
          result.validationErrors.length || result.code !== 0 ? 400 : 200,
        );
      }
    },
    "/api/enrichment/runs/:id/apply": {
      async POST(req: Request & { params: { id: string } }) {
        const runId = decodeURIComponent(req.params.id);
        const run = db
          .listEnrichmentRuns()
          .find((item: any) => item.id === runId) as
          | Record<string, unknown>
          | undefined;
        if (!run?.artifact_path) return json({ error: "not found" }, 404);
        const result = applyAcceptedProposals(
          {
            runId,
            directory: path.dirname(String(run.artifact_path)),
            databasePath: String(run.artifact_path),
            instructionsPath: path.join(
              path.dirname(String(run.artifact_path)),
              "instructions.md",
            ),
          },
          db,
        );
        db.setEnrichmentRunStatus(
          runId,
          result.errors.length ? "invalid" : "completed",
          result.errors.join("\n") || undefined,
        );
        return json(result, result.errors.length ? 400 : 200);
      }
    },
    "/api/enrichment/runs/:id/proposals": {
      GET(req: Request & { params: { id: string } }) {
        const runId = decodeURIComponent(req.params.id);
        const run = db
          .listEnrichmentRuns()
          .find((item: any) => item.id === runId) as
          | Record<string, unknown>
          | undefined;
        if (!run?.artifact_path) return json({ error: "not found" }, 404);
        const workspace = {
          runId,
          directory: path.dirname(String(run.artifact_path)),
          databasePath: String(run.artifact_path),
          instructionsPath: path.join(
            path.dirname(String(run.artifact_path)),
            "instructions.md",
          ),
        };
        return json(listEnrichmentProposals(workspace));
      },
      async POST(req: Request & { params: { id: string } }) {
        const runId = decodeURIComponent(req.params.id);
        const run = db
          .listEnrichmentRuns()
          .find((item: any) => item.id === runId) as
          | Record<string, unknown>
          | undefined;
        if (!run?.artifact_path) return json({ error: "not found" }, 404);
        const workspace = {
          runId,
          directory: path.dirname(String(run.artifact_path)),
          databasePath: String(run.artifact_path),
          instructionsPath: path.join(
            path.dirname(String(run.artifact_path)),
            "instructions.md",
          ),
        };
        const input = (await req.json()) as {
          table?: string;
          id?: number;
          reviewState?: "pending" | "accepted" | "rejected";
        };
        if (!input.table || !input.id || !input.reviewState) {
          return json(
            { error: "table, id, and reviewState are required" },
            400,
          );
        }
        try {
          return json({
            updated: setProposalReviewState(
              workspace,
              input.table,
              input.id,
              input.reviewState,
            ),
          });
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    }
  };
}
