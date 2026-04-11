import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

function extractElevenLabsError(details: string): string {
  if (!details) {
    return "Token generation failed";
  }

  try {
    const parsed: unknown = JSON.parse(details);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const detail = record.detail;
      if (detail && typeof detail === "object") {
        const detailMessage = (detail as Record<string, unknown>).message;
        if (typeof detailMessage === "string" && detailMessage.length > 0) {
          return `Token generation failed: ${detailMessage}`;
        }
      }

      if (typeof record.message === "string" && record.message.length > 0) {
        return `Token generation failed: ${record.message}`;
      }
    }
  } catch {
    // Ignore parse errors and fall back to raw text below.
  }

  return `Token generation failed: ${details.slice(0, 300)}`;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "ElevenLabs configuration is missing" },
      { status: 500 }
    );
  }

  try {
    const transport = new URL(req.url).searchParams.get("transport");
    const useWebSocket = transport === "websocket";
    const query = new URLSearchParams({
      agent_id: agentId,
    });
    const endpoint = useWebSocket
      ? `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?${query.toString()}`
      : `https://api.elevenlabs.io/v1/convai/conversation/token?${query.toString()}`;

    const response = await fetch(
      endpoint,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const details = await response.text();

      return NextResponse.json(
        { error: extractElevenLabsError(details) },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Token generation failed: Invalid response payload" },
        { status: 500 }
      );
    }

    if (useWebSocket) {
      const signedUrl =
        "signed_url" in data && typeof data.signed_url === "string"
          ? data.signed_url
          : "signedUrl" in data && typeof data.signedUrl === "string"
            ? data.signedUrl
            : undefined;

      if (!signedUrl) {
        return NextResponse.json(
          { error: "Token generation failed: Missing signed URL" },
          { status: 500 }
        );
      }

      return NextResponse.json({ signedUrl });
    }

    const token =
      "token" in data && typeof data.token === "string" ? data.token : undefined;
    if (!token) {
      return NextResponse.json(
        { error: "Token generation failed: Missing token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token generation failed" },
      { status: 500 }
    );
  }
}
