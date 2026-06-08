import OpenAI from "openai";
import { GoogleAuth } from "google-auth-library";
import { logger } from "./logger.ts";

export type ClientOptions = NonNullable<ConstructorParameters<typeof OpenAI>[0]>;

type ClientOptionOverrides = Omit<ClientOptions, "apiKey" | "baseURL">;

type GoogleAuthClientLike = {
  getAccessToken(): Promise<string | { token?: string | null } | null>;
  credentials?: {
    expiry_date?: number | null;
  };
};

export const OPENAI_BASE_URL = "https://api.openai.com/v1";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export type StaticApiKeyOptions = {
  apiKey?: string | null;
  envName?: string;
};

export type OpenAIClientOptionsInput = StaticApiKeyOptions & {
  baseURL?: string;
  overrides?: ClientOptionOverrides;
};

export type OpenRouterClientOptionsInput = StaticApiKeyOptions & {
  siteUrl?: string;
  appName?: string;
  baseURL?: string;
  overrides?: ClientOptionOverrides;
};

export type DeepSeekClientOptionsInput = StaticApiKeyOptions & {
  baseURL?: string;
  overrides?: ClientOptionOverrides;
};

export type GeminiClientOptionsInput = StaticApiKeyOptions & {
  baseURL?: string;
  overrides?: ClientOptionOverrides;
};

export type LiteLLMClientOptionsInput = StaticApiKeyOptions & {
  /**
   * Example: "http://localhost:4000"
   *
   * Do not append "/chat/completions"; the OpenAI SDK appends endpoint paths.
   */
  baseURL: string;

  /**
   * LiteLLM local proxy examples commonly use "anything".
   * Hosted LiteLLM deployments often use real virtual keys.
   */
  allowUnauthenticatedLocalProxy?: boolean;

  overrides?: ClientOptionOverrides;
};

export type VertexAIClientOptionsInput = {
  projectId: string;
  location: string;
  apiKey?: string | null;

  /**
   * Google examples commonly use v1; the original sample used v1beta1.
   */
  apiVersion?: "v1" | "v1beta1";

  /**
   * true:
   *   https://europe-west4-aiplatform.googleapis.com/...
   *
   * false:
   *   https://aiplatform.googleapis.com/...
   */
  regionalEndpoint?: boolean;

  scopes?: string[];

  /**
   * Return cached Google access token until this close to expiry.
   */
  refreshSkewMs?: number;

  overrides?: ClientOptionOverrides;
};

export type CustomOpenAICompatibleClientOptionsInput = StaticApiKeyOptions & {
  baseURL: string;
  overrides?: ClientOptionOverrides;
};

export type ProviderClientOptionsInput =
  | ({ provider: "openai" } & OpenAIClientOptionsInput)
  | ({ provider: "openrouter" } & OpenRouterClientOptionsInput)
  | ({ provider: "deepseek" } & DeepSeekClientOptionsInput)
  | ({ provider: "gemini" } & GeminiClientOptionsInput)
  | ({ provider: "vertex" } & VertexAIClientOptionsInput)
  | ({ provider: "litellm" } & LiteLLMClientOptionsInput)
  | ({ provider: "custom" } & CustomOpenAICompatibleClientOptionsInput);

export function openAIClientOptions(
  input: OpenAIClientOptionsInput = {},
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL ?? OPENAI_BASE_URL,
      apiKey: staticOrEnvApiKey({
        apiKey: input.apiKey,
        envName: input.envName ?? "OPENAI_API_KEY",
      }),
    },
    input.overrides,
  );
}

export function openRouterClientOptions(
  input: OpenRouterClientOptionsInput = {},
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL ?? OPENROUTER_BASE_URL,
      apiKey: staticOrEnvApiKey({
        apiKey: input.apiKey,
        envName: input.envName ?? "OPENROUTER_API_KEY",
      }),
      defaultHeaders: compactHeaders({
        "HTTP-Referer": input.siteUrl,
        "X-OpenRouter-Title": input.appName,
      }),
    },
    input.overrides,
  );
}

export function deepSeekClientOptions(
  input: DeepSeekClientOptionsInput = {},
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL ?? DEEPSEEK_BASE_URL,
      apiKey: staticOrEnvApiKey({
        apiKey: input.apiKey,
        envName: input.envName ?? "DEEPSEEK_API_KEY",
      }),
    },
    input.overrides,
  );
}

export function geminiClientOptions(
  input: GeminiClientOptionsInput = {},
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL ?? GEMINI_OPENAI_BASE_URL,
      apiKey: staticOrEnvApiKey({
        apiKey: input.apiKey,
        envName: input.envName ?? "GEMINI_API_KEY",
      }),
    },
    input.overrides,
  );
}

export function liteLLMClientOptions(
  input: LiteLLMClientOptionsInput,
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL,
      apiKey:
        input.apiKey ??
        envApiKey({
          envName: input.envName ?? "LITELLM_API_KEY",
          fallback: input.allowUnauthenticatedLocalProxy ? "anything" : undefined,
        }),
    },
    input.overrides,
  );
}

export function vertexAIClientOptions(
  input: VertexAIClientOptionsInput,
): ClientOptions {
  if (input.apiKey != null && input.apiKey.trim() !== "") {
    return composeClientOptions(
      {
        baseURL: vertexAIBaseURL(input),
        apiKey: "dummy",
        defaultHeaders: {
          "x-goog-api-key": input.apiKey,
          "Authorization": "none",
        },
      },
      input.overrides,
    );
  }

  return composeClientOptions(
    {
      baseURL: vertexAIBaseURL(input),
      apiKey: googleCloudAccessTokenApiKey({
        scopes: input.scopes,
        refreshSkewMs: input.refreshSkewMs,
      }),
    },
    input.overrides,
  );
}

export function customOpenAICompatibleClientOptions(
  input: CustomOpenAICompatibleClientOptionsInput,
): ClientOptions {
  return composeClientOptions(
    {
      baseURL: input.baseURL,
      apiKey: staticOrEnvApiKey({
        apiKey: input.apiKey,
        envName: input.envName ?? "OPENAI_COMPATIBLE_API_KEY",
      }),
    },
    input.overrides,
  );
}

export function clientOptionsForProvider(
  input: ProviderClientOptionsInput,
): ClientOptions {
  switch (input.provider) {
    case "openai":
      return openAIClientOptions(input);

    case "openrouter":
      return openRouterClientOptions(input);

    case "deepseek":
      return deepSeekClientOptions(input);

    case "gemini":
      return geminiClientOptions(input);

    case "vertex":
      return vertexAIClientOptions(input);

    case "litellm":
      return liteLLMClientOptions(input);

    case "custom":
      return customOpenAICompatibleClientOptions(input);

    default: {
      const exhaustive: never = input;
      throw new Error(`Unsupported provider: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function createOpenAIClient(input: ProviderClientOptionsInput): OpenAI {
  const client = new OpenAI(clientOptionsForProvider(input));
  if (input.provider === "vertex") {
    client.models.list = (async () => {
      return {
        data: [
          { id: "google/gemini-2.5-flash", object: "model", created: 0, owned_by: "google" },
          { id: "google/gemini-2.5-flash-lite", object: "model", created: 0, owned_by: "google" },
          { id: "google/gemini-2.5-pro", object: "model", created: 0, owned_by: "google" },
          { id: "google/gemini-1.5-flash", object: "model", created: 0, owned_by: "google" },
          { id: "google/gemini-1.5-pro", object: "model", created: 0, owned_by: "google" }
        ],
        object: "list"
      } as any;
    }) as any;
  }
  return client;
}

function staticOrEnvApiKey(input: {
  apiKey?: string | null;
  envName: string;
}): ClientOptions["apiKey"] {
  if (input.apiKey != null) {
    assertNonEmpty(input.apiKey, "apiKey");
    return input.apiKey;
  }

  return envApiKey({ envName: input.envName });
}

function envApiKey(input: {
  envName: string;
  fallback?: string;
}): Exclude<ClientOptions["apiKey"], string | null | undefined> {
  return async () => {
    const value = process.env[input.envName] ?? input.fallback;

    if (!value?.trim()) {
      throw new Error(`Missing required API key environment variable: ${input.envName}`);
    }

    return value;
  };
}

function googleCloudAccessTokenApiKey(input: {
  scopes?: string[];
  refreshSkewMs?: number;
} = {}): Exclude<ClientOptions["apiKey"], string | null | undefined> {
  const auth = new GoogleAuth({
    scopes: input.scopes ?? ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const refreshSkewMs = input.refreshSkewMs ?? 5 * 60 * 1000;

  let authClientPromise: Promise<GoogleAuthClientLike> | undefined;
  let cachedToken:
    | {
        value: string;
        expiresAtMs?: number;
      }
    | undefined;

  return async () => {
    if (cachedToken && !isExpiring(cachedToken.expiresAtMs, refreshSkewMs)) {
      return cachedToken.value;
    }

    authClientPromise ??= auth.getClient().then((client) => client as GoogleAuthClientLike);

    const authClient = await authClientPromise;
    const accessTokenResponse = await authClient.getAccessToken();

    const token =
      typeof accessTokenResponse === "string"
        ? accessTokenResponse
        : accessTokenResponse?.token;

    if (!token?.trim()) {
      throw new Error("Failed to obtain Google Cloud OAuth access token.");
    }

    cachedToken = {
      value: token,
      expiresAtMs: authClient.credentials?.expiry_date ?? undefined,
    };

    return cachedToken.value;
  };
}

function isExpiring(
  expiresAtMs: number | undefined,
  refreshSkewMs: number,
): boolean {
  if (!expiresAtMs) {
    return false;
  }

  return expiresAtMs <= Date.now() + refreshSkewMs;
}

function vertexAIBaseURL(input: VertexAIClientOptionsInput): string {
  assertNonEmpty(input.projectId, "projectId");
  assertNonEmpty(input.location, "location");

  const apiVersion = input.apiVersion ?? "v1beta1";
  const regionalEndpoint = input.regionalEndpoint ?? true;

  const host = regionalEndpoint
    ? `${input.location}-aiplatform.googleapis.com`
    : "aiplatform.googleapis.com";

  return (
    `https://${host}/${apiVersion}` +
    `/projects/${input.projectId}` +
    `/locations/${input.location}` +
    `/endpoints/openapi`
  );
}

function composeClientOptions(
  providerOptions: ClientOptions,
  overrides: ClientOptionOverrides | undefined,
): ClientOptions {
  if (!overrides) {
    return providerOptions;
  }

  const {
    defaultHeaders: overrideHeaders,
    defaultQuery: overrideQuery,
    ...overrideRest
  } = overrides;

  const {
    defaultHeaders: providerHeaders,
    defaultQuery: providerQuery,
    ...providerRest
  } = providerOptions;

  return {
    ...overrideRest,
    ...providerRest,
    defaultHeaders: mergeRecordLike(overrideHeaders, providerHeaders) as any,
    defaultQuery: mergeRecordLike(overrideQuery, providerQuery) as any,
  };
}

function compactHeaders(
  headers: Record<string, string | undefined | null>,
): Record<string, string> | undefined {
  const compacted = Object.fromEntries(
    Object.entries(headers).filter(([, value]) => Boolean(value?.trim())),
  ) as Record<string, string>;

  return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function mergeRecordLike(
  base: any,
  override: any,
): any {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

function assertNonEmpty(value: string, name: string): void {
  if (!value.trim()) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}
