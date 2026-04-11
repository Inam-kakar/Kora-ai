import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  formatFinanceContext,
  getFinanceSnapshot,
  type FinanceSnapshot,
} from "@/lib/finance-live-data";
import { geminiFlash } from "@/lib/gemini";
import { connectDB } from "@/lib/mongodb";
import { KORA_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { persistRealtimeTurnMemory } from "@/lib/realtime-memory";
import { findSimilarMemories } from "@/lib/vector-search";

const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5000),
});

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
  history: z.array(ChatHistoryMessageSchema).max(40).optional(),
});

const VERTEX_AUTH_FAILURE_PATTERNS: readonly RegExp[] = [
  /could not load the default credentials/i,
  /application default credentials/i,
  /metadata (?:lookup|server|service)/i,
  /compute engine metadata/i,
  /failed to (?:retrieve|contact|determine).*metadata/i,
  /getting metadata from plugin failed/i,
  /could not refresh access token/i,
  /unauthenticated/i,
  /authentication (?:failed|required)/i,
];

const VERTEX_AUTH_ACTION_MESSAGE =
  "Vertex authentication is not configured. Run `gcloud auth login`, then verify `gcloud auth print-access-token` works. You can also set `GOOGLE_VERTEX_API_KEY` in your environment. Restart the dev server and retry.";

type NormalizedRouteError = {
  name: string;
  message: string;
  code?: string;
  cause?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorField(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return toErrorField(error.code);
}

function getErrorCause(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const cause = error.cause;
  if (cause instanceof Error) {
    return cause.message;
  }

  if (isRecord(cause)) {
    return toErrorField(cause.message);
  }

  return toErrorField(cause);
}

function normalizeRouteError(error: unknown): NormalizedRouteError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message,
      code: getErrorCode(error),
      cause: getErrorCause(error),
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : String(error),
    code: getErrorCode(error),
    cause: getErrorCause(error),
  };
}

function isVertexCredentialFailure(error: NormalizedRouteError): boolean {
  const searchable = [error.message, error.code, error.cause]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return VERTEX_AUTH_FAILURE_PATTERNS.some((pattern) =>
    pattern.test(searchable)
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id, "checkin");
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    await connectDB();

    // Fetch memories and finance data in parallel to reduce pre-LLM latency
    const [relevantMemories, financeSnapshot] = await Promise.allSettled([
      findSimilarMemories(session.user.id, parsed.data.message, {
        limit: 8,
        minScore: 0.65,
      }),
      getFinanceSnapshot(parsed.data.message),
    ]);

    const memories =
      relevantMemories.status === "fulfilled" ? relevantMemories.value : [];

    if (relevantMemories.status === "rejected") {
      console.error({
        userId: session.user.id,
        operation: "findSimilarMemories",
        error:
          relevantMemories.reason instanceof Error
            ? relevantMemories.reason.message
            : String(relevantMemories.reason),
      });
    }

    const resolvedFinanceSnapshot: FinanceSnapshot | null =
      financeSnapshot.status === "fulfilled" ? financeSnapshot.value : null;

    if (financeSnapshot.status === "rejected") {
      console.error({
        userId: session.user.id,
        operation: "finance-live-data",
        error:
          financeSnapshot.reason instanceof Error
            ? financeSnapshot.reason.message
            : String(financeSnapshot.reason),
      });
    }

    // Build rich memory context block
    const memoryContext = memories.length
      ? `\n\n## Retrieved memory context (${memories.length} relevant entries)\nUse these to personalise your answer — reference dates and specifics when helpful:\n${memories
          .map(
            (memory, index) =>
              `[${index + 1}] ${new Date(memory.createdAt).toISOString().slice(0, 10)} | score ${memory.score.toFixed(2)} | themes: ${(memory.themes ?? []).join(", ") || "—"}\n    ${memory.summary}`
          )
          .join("\n")}`
      : "";

    const financeContext = formatFinanceContext(resolvedFinanceSnapshot);
    const history = parsed.data.history ?? [];

    const modelMessages = [
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user" as const,
        content: parsed.data.message,
      },
    ];

    // Stream the response immediately — user sees tokens as they arrive
    const result = streamText({
      model: geminiFlash(),
      system: KORA_CHAT_SYSTEM_PROMPT + memoryContext + financeContext,
      messages: modelMessages,
      maxOutputTokens: 600,
      temperature: 0.6,
      // Prevent Vertex from sending an empty toolConfig that causes INVALID_ARGUMENT
      toolChoice: "none",
      providerOptions: {
        vertex: {
          streamFunctionCallArguments: false,
        },
      },
      onFinish: ({ text }) => {
        // Fire-and-forget memory persistence — never blocks the stream
        void persistRealtimeTurnMemory({
          userId: session.user.id!,
          sessionId: parsed.data.sessionId,
          mode: "chat",
          userMessage: parsed.data.message,
          assistantMessage: text,
          financeSnapshot: resolvedFinanceSnapshot,
        }).catch((error) => {
          const normalizedError = normalizeRouteError(error);
          console.error({
            userId: session.user.id,
            operation: "background-chat-memory-persist",
            error: normalizedError,
          });
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const normalizedError = normalizeRouteError(error);

    console.error({
      userId: session.user.id,
      operation: "chat-mode-response",
      error: normalizedError,
    });

    if (isVertexCredentialFailure(normalizedError)) {
      return NextResponse.json(
        {
          error: VERTEX_AUTH_ACTION_MESSAGE,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? normalizedError.message : "Chat request failed",
      },
      { status: 500 }
    );
  }
}
