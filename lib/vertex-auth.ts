import { spawnSync } from "child_process";
import type { GaxiosOptions, GaxiosResponse } from "gaxios";
import {
  AuthClient,
  GoogleAuth,
  type GoogleAuthOptions,
} from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const GCLOUD_TOKEN_TTL_MS = 45 * 60 * 1000;
const MISSING_ADC_ERROR_FRAGMENT = "Could not load the default credentials.";

type AdcTokenProvider = () => Promise<string | null>;
type GcloudTokenProvider = () => string | undefined;
type Clock = () => number;

type GcloudCommandResult = {
  status: number | null;
  stdout: string;
};

export interface VertexCliFallbackAuthClientOptions {
  projectId?: string;
  getAdcAccessToken?: AdcTokenProvider;
  getGcloudAccessToken?: GcloudTokenProvider;
  now?: Clock;
  gcloudTokenTtlMs?: number;
}

type CachedToken = {
  value: string;
  expiresAt: number;
};

function runGcloudCommand(args: string[]): GcloudCommandResult {
  const result = spawnSync("gcloud", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.error) {
    return {
      status: null,
      stdout: "",
    };
  }

  return {
    status: result.status,
    stdout: result.stdout ?? "",
  };
}

function readGcloudValue(args: string[]): string | undefined {
  const result = runGcloudCommand(args);
  if (result.status !== 0) {
    return undefined;
  }

  const value = result.stdout.trim();
  if (!value || value === "(unset)") {
    return undefined;
  }

  return value;
}

function isMissingDefaultCredentialsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes(MISSING_ADC_ERROR_FRAGMENT);
}

function createDefaultAdcTokenProvider(
  projectId?: string
): AdcTokenProvider {
  const auth = new GoogleAuth({
    projectId,
    scopes: [CLOUD_PLATFORM_SCOPE],
  });

  let authClientPromise: Promise<AuthClient> | undefined;

  return async () => {
    try {
      authClientPromise ??= auth.getClient();
      const authClient = await authClientPromise;
      const token = await authClient.getAccessToken();

      if (typeof token === "string") {
        return token || null;
      }

      return token?.token ?? null;
    } catch (error: unknown) {
      if (isMissingDefaultCredentialsError(error)) {
        return null;
      }

      throw error;
    }
  };
}

function readGcloudAccessToken(): string | undefined {
  return readGcloudValue(["auth", "print-access-token", "--quiet"]);
}

export function readGcloudConfig(setting: string): string | undefined {
  return readGcloudValue(["config", "get-value", setting, "--quiet"]);
}

export class VertexCliFallbackAuthClient extends AuthClient {
  private readonly getAdcAccessToken: AdcTokenProvider;
  private readonly getGcloudAccessToken: GcloudTokenProvider;
  private readonly now: Clock;
  private readonly gcloudTokenTtlMs: number;
  private cachedGcloudToken: CachedToken | undefined;

  constructor(options: VertexCliFallbackAuthClientOptions = {}) {
    super({ projectId: options.projectId });
    this.getAdcAccessToken =
      options.getAdcAccessToken ??
      createDefaultAdcTokenProvider(options.projectId);
    this.getGcloudAccessToken =
      options.getGcloudAccessToken ?? readGcloudAccessToken;
    this.now = options.now ?? Date.now;
    this.gcloudTokenTtlMs = options.gcloudTokenTtlMs ?? GCLOUD_TOKEN_TTL_MS;
  }

  private readCachedGcloudToken(): string | undefined {
    if (!this.cachedGcloudToken) {
      return undefined;
    }

    if (this.cachedGcloudToken.expiresAt <= this.now()) {
      this.cachedGcloudToken = undefined;
      return undefined;
    }

    return this.cachedGcloudToken.value;
  }

  private cacheGcloudToken(token: string): void {
    this.cachedGcloudToken = {
      value: token,
      expiresAt: this.now() + this.gcloudTokenTtlMs,
    };
  }

  async getAccessToken(): Promise<{ token?: string | null }> {
    const adcToken = await this.getAdcAccessToken();
    if (adcToken) {
      return { token: adcToken };
    }

    const cachedToken = this.readCachedGcloudToken();
    if (cachedToken) {
      return { token: cachedToken };
    }

    const gcloudToken = this.getGcloudAccessToken();
    if (gcloudToken) {
      this.cacheGcloudToken(gcloudToken);
      return { token: gcloudToken };
    }

    throw new Error(
      "Google Vertex authentication failed: ADC is unavailable and no gcloud CLI access token could be loaded. Run `gcloud auth login` and verify `gcloud auth print-access-token`, or set GOOGLE_VERTEX_API_KEY."
    );
  }

  async getRequestHeaders(): Promise<Headers> {
    const tokenResult = await this.getAccessToken();
    const headers = new Headers();

    if (tokenResult.token) {
      headers.set("Authorization", `Bearer ${tokenResult.token}`);
    }

    return headers;
  }

  async request<T>(opts: GaxiosOptions): Promise<GaxiosResponse<T>> {
    const requestHeaders = new Headers(opts.headers as HeadersInit | undefined);
    const authHeaders = await this.getRequestHeaders();

    authHeaders.forEach((value, key) => {
      requestHeaders.set(key, value);
    });

    return this.transporter.request<T>({
      ...opts,
      headers: requestHeaders,
    });
  }
}

export function createVertexGoogleAuthOptions(
  projectId?: string
): GoogleAuthOptions<AuthClient> {
  return {
    projectId,
    authClient: new VertexCliFallbackAuthClient({ projectId }),
  };
}
