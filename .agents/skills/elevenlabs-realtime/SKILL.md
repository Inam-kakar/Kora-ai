---
name: elevenlabs-realtime
description: >
  Implement a fully working real-time voice conversation feature where the agent
  can talk AND listen simultaneously using ElevenLabs Conversational AI SDK.
  Use this skill whenever the user wants to add voice chat, a voice assistant,
  a real-time talking agent, a voice interface, microphone input + AI speech output,
  or anything described as "the agent talks back", "talk to the AI", "voice mode",
  "real-time conversation", or "ElevenLabs conversation". Covers both the React
  component layer (@elevenlabs/react) and the Next.js API route for private-agent
  authentication. Also use when the user asks about interruption handling, VAD
  (voice activity detection), audio visualisation during speech, or client tools
  that the agent can invoke during a conversation.
---

# ElevenLabs Real-Time Conversational AI

Covers the complete implementation: SDK setup, auth route, ConversationProvider,
React component with full talk/listen UI, interruption handling, and client tools.

---

## 1. How it works (mental model)

```
Browser mic  ──PCM 16kHz──▶  ElevenLabs Conversational AI (cloud)
                               │  ASR → LLM → TTS all in one pipeline
Browser speaker ◀──MP3 chunks──┘

Connection type: WebRTC (preferred, lower latency) or WebSocket
```

The SDK handles VAD, barge-in interruption, and turn-taking automatically.
Your job is: start session → render status UI → handle callbacks.

---

## 2. Install (Bun)

```bash
bun add @elevenlabs/react
# @elevenlabs/client is a peer dep, installed automatically
```

No other audio libraries needed — the SDK owns mic input and speaker output.

---

## 3. Environment variables

```bash
# .env.local
ELEVENLABS_API_KEY=sk_...          # server-side only — never expose to client
ELEVENLABS_AGENT_ID=agent_...      # can be public if agent is public
```

---

## 4. Next.js API route — signed token for private agents

For private agents the client must never hold the API key.
The server mints a short-lived token and hands it to the browser.

```typescript
// app/api/elevenlabs/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';            // your NextAuth helper

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID!,
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }

  const { token } = await response.json();
  return NextResponse.json({ token });
}
```

> For **public agents** (no auth required in ElevenLabs dashboard), skip this route entirely
> and pass `agentId` directly to `startSession`. See section 6.

---

## 5. ConversationProvider — wrap the feature subtree

`useConversation` and all granular hooks **require a `ConversationProvider` ancestor**.
Place it as close to the feature as possible — not at the app root.

```tsx
// components/voice/VoiceConversationRoot.tsx
'use client';
import { ConversationProvider } from '@elevenlabs/react';
import { KoraVoiceInterface }    from './KoraVoiceInterface';

export function VoiceConversationRoot() {
  return (
    <ConversationProvider
      onMessage={({ message, source }) => {
        // fires for every transcript — agent or user
        console.log(source, message);
      }}
      onError={(msg) => console.error('ElevenLabs error:', msg)}
    >
      <KoraVoiceInterface />
    </ConversationProvider>
  );
}
```

---

## 6. Main conversation component (full talk + listen)

```tsx
// components/voice/KoraVoiceInterface.tsx
'use client';
import { useCallback, useState } from 'react';
import {
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from '@elevenlabs/react';

export function KoraVoiceInterface() {
  const { startSession, endSession, setMuted } = useConversationControls();
  const { status }    = useConversationStatus();    // 'disconnected' | 'connecting' | 'connected'
  const { mode }      = useConversationMode();      // 'speaking' | 'listening'
  const [muted, setMutedState] = useState(false);

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    // 1. Gate on microphone permission before showing the SDK prompt
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('Microphone access is required for voice conversations.');
      return;
    }

    // 2. Fetch a server-minted token (private agent)
    const res = await fetch('/api/elevenlabs/token', { method: 'POST' });
    const { token } = await res.json();

    // 3. Start session — WebRTC gives lower latency than WebSocket
    await startSession({
      conversationToken: token,
      connectionType: 'webrtc',     // or 'websocket' for environments without WebRTC
      onConnect: ({ conversationId }) => {
        console.log('Session started:', conversationId);
      },
      onDisconnect: () => {
        console.log('Session ended');
      },
    });
  }, [startSession]);

  // ── For PUBLIC agents (no auth) replace connect() body with: ───────────────
  // await startSession({
  //   agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
  //   connectionType: 'webrtc',
  // });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    await endSession();
  }, [endSession]);

  // ── Mute toggle ────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  const isConnected   = status === 'connected';
  const isConnecting  = status === 'connecting';
  const agentSpeaking = isConnected && mode === 'speaking';
  const userListened  = isConnected && mode === 'listening';

  return (
    <div className="flex flex-col items-center gap-6 p-8">

      {/* Status label */}
      <p className="text-sm text-neutral-500">
        {status === 'disconnected' && 'Tap to start talking'}
        {status === 'connecting'   && 'Connecting…'}
        {isConnected && agentSpeaking && 'KORA is speaking'}
        {isConnected && userListened  && 'Listening…'}
      </p>

      {/* Main button */}
      <button
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        className={[
          'w-20 h-20 rounded-full transition-all duration-200 font-medium text-white',
          isConnecting  ? 'bg-neutral-400 cursor-wait' : '',
          !isConnected && !isConnecting ? 'bg-indigo-600 hover:bg-indigo-700' : '',
          isConnected   ? 'bg-rose-500 hover:bg-rose-600' : '',
          agentSpeaking ? 'ring-4 ring-indigo-300 ring-offset-2 animate-pulse' : '',
          userListened  ? 'ring-4 ring-green-300 ring-offset-2' : '',
        ].join(' ')}
      >
        {isConnecting ? '…' : isConnected ? 'End' : 'Talk'}
      </button>

      {/* Mute toggle — only visible when connected */}
      {isConnected && (
        <button
          onClick={toggleMute}
          className="text-xs text-neutral-500 hover:text-neutral-800 underline"
        >
          {muted ? 'Unmute mic' : 'Mute mic'}
        </button>
      )}
    </div>
  );
}
```

---

## 7. Granular hooks reference

Use granular hooks instead of `useConversation` to avoid unnecessary re-renders:

| Hook | Returns | Use for |
|---|---|---|
| `useConversationControls()` | `startSession`, `endSession`, `setMuted`, `sendMessage` | Action triggers |
| `useConversationStatus()` | `status`, `isMuted`, `canSendFeedback` | Connection badge |
| `useConversationMode()` | `mode` (`'speaking'`\|`'listening'`), `isSpeaking`, `isListening` | Avatar animation |
| `useConversationInput()` | `getInputByteFrequencyData()` | Mic waveform visualiser |
| `useConversation()` | All of the above combined | Simple components where render perf is fine |

---

## 8. Client tools — agent calls back into your app

Client tools let the ElevenLabs agent trigger actions in your UI mid-conversation.
Register them on `ConversationProvider`:

```tsx
<ConversationProvider
  clientTools={{
    // Agent calls this when it wants to show a past memory
    showMemory: async ({ memoryId }: { memoryId: string }) => {
      router.push(`/memories/${memoryId}`);
      return 'Memory displayed';   // returned string goes back to the agent
    },
    // Agent calls this to display a pattern alert card
    showPatternAlert: async ({ patternTitle, message }: { patternTitle: string; message: string }) => {
      setActiveAlert({ patternTitle, message });
      return 'Alert shown';
    },
  }}
>
```

> Tools must be **configured identically in the ElevenLabs dashboard** (same name, same parameters).
> If a tool returns a value, mark it **blocking** in the dashboard so the agent awaits it.

---

## 9. Interruption handling

The SDK handles barge-in (user speaking over the agent) automatically when using
WebRTC or WebSocket. You do not need to implement interruption detection yourself.

If you need to react to interruptions in the UI (e.g. clear a transcript display):

```tsx
<ConversationProvider
  onMessage={({ message, source }) => {
    if (source === 'user') {
      // user transcript arrived — agent may have been interrupted
      setLastUserMessage(message);
    }
  }}
>
```

---

## 10. Audio waveform visualiser (optional)

```tsx
// components/voice/MicWaveform.tsx
'use client';
import { useEffect, useRef } from 'react';
import { useConversationInput, useConversationStatus } from '@elevenlabs/react';

export function MicWaveform() {
  const { getInputByteFrequencyData } = useConversationInput();
  const { status } = useConversationStatus();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (status !== 'connected') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      const data = getInputByteFrequencyData();   // Uint8Array | null
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (data) {
        const barW = canvas.width / data.length;
        data.forEach((v, i) => {
          const h = (v / 255) * canvas.height;
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(i * barW, canvas.height - h, barW - 1, h);
        });
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, getInputByteFrequencyData]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={48}
      className="rounded-md opacity-70"
    />
  );
}
```

---

## 11. Conversation overrides (dynamic agent config)

Override the agent's system prompt or first message per-session:

```tsx
await startSession({
  conversationToken: token,
  connectionType: 'webrtc',
  overrides: {
    agent: {
      prompt: {
        prompt: `You are KORA. The user's name is ${session.user.name}.
                 Their financial stress score today is ${stressScore}.`,
      },
      firstMessage: `Hi ${session.user.name}, how are you feeling financially today?`,
    },
    tts: {
      voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
    },
  },
});
```

---

## 12. Common pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Hook throws "no provider" | `useConversation*` used outside `ConversationProvider` | Wrap the component tree |
| Mic prompt never appears | `getUserMedia` blocked by browser (HTTPS required in prod) | Gate on `getUserMedia` call before `startSession`; show explain UI |
| Agent audio plays through earpiece on iOS | iOS Safari default audio routing | Add `preferHeadphonesForIosDevices: true` to `ConversationProvider` |
| Session connects then immediately drops | API key exposed in browser, rate-limited | Use the `/api/elevenlabs/token` server route |
| `mode` stuck on `'speaking'` | Barge-in disabled in ElevenLabs agent settings | Enable interruption in the ElevenLabs dashboard |
| TypeScript errors on `overrides` | Using `@11labs/react` (old package) | Migrate to `@elevenlabs/react` |
| `startSession` called twice | No guard on button double-click | Disable button while `status !== 'disconnected'` |

---

## 13. File checklist for a full implementation

```
app/api/elevenlabs/token/route.ts    ← server token mint (private agents)
components/voice/
  VoiceConversationRoot.tsx          ← ConversationProvider wrapper
  KoraVoiceInterface.tsx             ← main connect/disconnect UI
  MicWaveform.tsx                    ← optional visualiser
.env.local                           ← ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID
```

See `references/websocket-raw.md` for the raw WebSocket protocol
if you need to bypass the SDK (e.g. server-to-server or custom audio pipeline).
