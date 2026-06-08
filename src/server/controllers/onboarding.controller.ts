import { type OnboardingJob } from "../source-onboarding.ts";

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function publicJob(job: OnboardingJob) {
  const { stagingDir: _stagingDir, ...visible } = job;
  return visible;
}

export function createOnboardingRoutes(onboarding: any, onboardingToken?: string) {
  const checkAuth = (req: Request) => {
    if (!onboarding) return json({ error: "AI adapter onboarding is disabled" }, 404);
    if (!onboardingToken || req.headers.get("authorization") !== `Bearer ${onboardingToken}`) {
      return json({ error: "unauthorized" }, 401);
    }
    return null;
  };

  return {
    "/api/source-onboarding/jobs": {
      async POST(req: Request) {
        const authErr = checkAuth(req);
        if (authErr) return authErr;
        try {
          return json(
            publicJob(onboarding.create((await req.json()) as any)),
            202,
          );
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
      }
    },
    "/api/source-onboarding/jobs/:id": {
      GET(req: Request & { params: { id: string } }) {
        const authErr = checkAuth(req);
        if (authErr) return authErr;
        const job = onboarding.get(req.params.id);
        if (!job) return json({ error: "not found" }, 404);
        return json(publicJob(job));
      }
    },
    "/api/source-onboarding/jobs/:id/:action": {
      POST(req: Request & { params: { id: string; action: string } }) {
        const authErr = checkAuth(req);
        if (authErr) return authErr;
        const job = onboarding.get(req.params.id);
        if (!job) return json({ error: "not found" }, 404);
        const action = req.params.action;
        try {
          if (action === "approve") return json(publicJob(onboarding.approve(job.id)));
          if (action === "reject") return json(publicJob(onboarding.reject(job.id)));
          if (action === "retry") return json(publicJob(onboarding.retry(job.id)), 202);
        } catch (error) {
          return json({ error: (error as Error).message }, 400);
        }
        return json({ error: "not found" }, 404);
      },
      GET(req: Request & { params: { id: string; action: string } }) {
        const authErr = checkAuth(req);
        if (authErr) return authErr;
        const job = onboarding.get(req.params.id);
        if (!job) return json({ error: "not found" }, 404);
        if (req.params.action === "events") {
          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              let index = 0;
              let timer: ReturnType<typeof setInterval>;
              const send = () => {
                while (index < job.events.length) {
                  controller.enqueue(
                    encoder.encode(
                      `event: progress\ndata: ${JSON.stringify(job.events[index++])}\n\n`,
                    ),
                  );
                }
                if (
                  ["activated", "failed", "inconclusive", "rejected"].includes(
                    job.status,
                  )
                ) {
                  controller.enqueue(
                    encoder.encode(
                      `event: done\ndata: ${JSON.stringify(publicJob(job))}\n\n`,
                    ),
                  );
                  controller.close();
                  clearInterval(timer);
                }
              };
              timer = setInterval(send, 250);
              send();
            },
          });
          return new Response(stream, {
            headers: {
              "content-type": "text/event-stream",
              "cache-control": "no-store",
            },
          });
        }
        return json({ error: "not found" }, 404);
      }
    }
  };
}
