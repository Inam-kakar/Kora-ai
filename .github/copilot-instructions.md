# KORA — GitHub Copilot Instructions
# Financial Memory Agent · Next.js Full-Stack · Agentic AI · MongoDB Atlas Vector Search · ElevenLabs

---

## 1. Project Identity

**KORA** is a voice-first financial memory agent. It ingests daily voice check-ins, builds a long-term behavioural memory of the user's financial life, detects recurring patterns, and proactively intervenes — in voice — when the user is about to repeat a past mistake.

**Core loop:**
```
User speaks → transcription → memory embedding → MongoDB Atlas Vector Store
                                                       ↓
                          Agentic pipeline (background, scheduled, event-driven)
                                                       ↓
                   Pattern match → ElevenLabs voice response / proactive alert
```

---

## 2. Technology Stack — Always Use These

| Layer | Technology | Notes |
|---|---|---|
| Runtime | **Bun** | Use `bun` for all scripts, installs, and execution. Never `node`, `npm`, or `npx`. |
| Framework | **Next.js 14+ (App Router)** | All routes in `/app`. No Pages Router. |
| Language | **TypeScript strict mode** | `"strict": true` in tsconfig. No `any`. |
| AI SDK | **Vercel AI SDK (`ai` package)** | Use `streamText`, `generateText`, `generateObject`. |
| LLM | **Claude claude-sonnet-4-20250514** (Anthropic) | Default for all agentic tasks. |
| Embeddings | **text-embedding-3-small** (OpenAI) | 1536-dim vectors for memory entries. |
| Vector DB | **MongoDB Atlas Vector Search** | Collection: `memories`. Index: `vector_index`. |
| ODM | **Mongoose** | All schemas typed with TypeScript generics. |
| Voice Input | **Whisper API** (OpenAI) | Transcription of user audio blobs. |
| Voice Output | **ElevenLabs Streaming TTS** | Always stream — never buffer full audio. |
| Auth | **NextAuth.js v5** | JWT strategy. Providers: Google + Email magic link. |
| Styling | **Tailwind CSS v3** | Utility-first. No inline `style=` unless dynamic values. |
| State | **Zustand** | Client store for conversation, agent status, playback. |
| Background Jobs | **Vercel Cron + `@vercel/kv`** | Scheduled agent tasks. |
| Forms | **React Hook Form + Zod** | All form validation through Zod schemas. |
| Testing | **Vitest + React Testing Library** | Co-locate tests: `*.test.ts` next to source. |

---

## 3. Project Structure — Follow Exactly

```
/app
  /api
    /agents
      /memory/route.ts          # POST: ingest voice entry, embed, store
      /pattern/route.ts         # POST: run pattern analysis on user history
      /trigger/route.ts         # POST: check upcoming decisions vs patterns
      /research/route.ts        # POST: market/rate data for a decision topic
      /document/route.ts        # POST: generate Financial Life Review PDF
      /emotion/route.ts         # POST: analyse tone + adjust response style
    /checkin/route.ts           # POST: start a check-in session (returns stream)
    /voice/transcribe/route.ts  # POST: Whisper transcription of audio blob
    /voice/synthesize/route.ts  # POST: ElevenLabs TTS stream
    /webhooks/cron/route.ts     # GET: Vercel Cron entry point
  /(auth)
    /login/page.tsx
    /callback/page.tsx
  /(app)
    /dashboard/page.tsx
    /checkin/page.tsx           # Main voice check-in interface
    /memories/page.tsx          # Browse/search past entries
    /patterns/page.tsx          # Visualise behavioural patterns
    /review/page.tsx            # Annual Financial Life Review
    /settings/page.tsx
  /layout.tsx
  /page.tsx

/agents
  /memory-agent.ts             # Extracts themes, emotions, decision points
  /pattern-agent.ts            # Cross-entry pattern detection
  /trigger-agent.ts            # Pattern match → proactive alert logic
  /research-agent.ts           # External data retrieval (rates, news)
  /document-agent.ts           # Report generation
  /emotion-agent.ts            # Vocal tone + word choice analysis

/lib
  /mongodb.ts                  # Singleton Mongoose connection
  /elevenlabs.ts               # ElevenLabs streaming client
  /embeddings.ts               # embed() helper using text-embedding-3-small
  /vector-search.ts            # Atlas Vector Search query helpers
  /agent-runner.ts             # Orchestrator: runs agents in sequence/parallel
  /prompts.ts                  # All system prompts (exported constants, not inline)

/models
  /User.ts
  /MemoryEntry.ts
  /Pattern.ts
  /TriggerAlert.ts
  /CheckinSession.ts

/hooks
  /useVoiceRecorder.ts
  /useElevenLabsStream.ts
  /useAgentStatus.ts
  /usePatterns.ts

/components
  /voice
    /VoiceRecorder.tsx
    /WaveformVisualizer.tsx
    /KoraAvatar.tsx            # Animated avatar reacts to ElevenLabs audio
  /memory
    /MemoryCard.tsx
    /MemoryTimeline.tsx
  /patterns
    /PatternCard.tsx
    /EmotionHeatmap.tsx
  /ui                          # shadcn/ui re-exports with custom variants

/types
  /agents.ts
  /memory.ts
  /voice.ts

/schemas                       # Zod schemas (shared client + server)
  /checkin.ts
  /memory-entry.ts
  /agent-output.ts
```

---

## 4. MongoDB Atlas Vector Search — Core Patterns

### 4.1 MemoryEntry Schema

```typescript
// models/MemoryEntry.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMemoryEntry extends Document {
  userId: string;
  sessionId: string;
  createdAt: Date;
  transcript: string;
  embedding: number[];           // 1536-dim from text-embedding-3-small
  themes: string[];              // extracted: ['impulse_purchase', 'loan_request', ...]
  emotions: {
    primary: string;             // 'stress' | 'excitement' | 'regret' | 'confidence'
    intensity: number;           // 0–1
    markers: string[];           // word-level evidence
  };
  decisionPoints: Array<{
    type: string;                // 'investment' | 'loan' | 'purchase' | 'avoid'
    amount?: number;
    currency?: string;
    counterparty?: string;
    deadline?: Date;
    resolved?: boolean;
    outcome?: string;
  }>;
  stressScore: number;           // 0–1, composite
  summary: string;               // 1–2 sentence AI summary
  metadata: Record<string, unknown>;
}

const MemoryEntrySchema = new Schema<IMemoryEntry>({
  userId:        { type: String, required: true, index: true },
  sessionId:     { type: String, required: true },
  createdAt:     { type: Date,   default: Date.now, index: true },
  transcript:    { type: String, required: true },
  embedding:     { type: [Number], required: true },
  themes:        [String],
  emotions: {
    primary:   String,
    intensity: Number,
    markers:   [String],
  },
  decisionPoints: [{
    type:         String,
    amount:       Number,
    currency:     String,
    counterparty: String,
    deadline:     Date,
    resolved:     Boolean,
    outcome:      String,
  }],
  stressScore: Number,
  summary:     String,
  metadata:    Schema.Types.Mixed,
});

// Atlas Search index name must match exactly
MemoryEntrySchema.index({ embedding: '2dsphere' }); // placeholder; real index in Atlas UI

export const MemoryEntry = mongoose.model<IMemoryEntry>('MemoryEntry', MemoryEntrySchema);
```

### 4.2 Vector Search Query Helper

```typescript
// lib/vector-search.ts
import { connectDB } from './mongodb';
import { MemoryEntry, IMemoryEntry } from '@/models/MemoryEntry';
import { embed } from './embeddings';

export interface VectorSearchResult extends IMemoryEntry {
  score: number;
}

export async function findSimilarMemories(
  userId: string,
  queryText: string,
  options: {
    limit?: number;
    minScore?: number;
    dateFrom?: Date;
    themes?: string[];
  } = {}
): Promise<VectorSearchResult[]> {
  await connectDB();

  const queryEmbedding = await embed(queryText);

  const pipeline: object[] = [
    {
      $vectorSearch: {
        index: 'vector_index',          // must match Atlas index name
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit: options.limit ?? 10,
        filter: {
          userId,
          ...(options.dateFrom && { createdAt: { $gte: options.dateFrom } }),
          ...(options.themes?.length && { themes: { $in: options.themes } }),
        },
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    ...(options.minScore
      ? [{ $match: { score: { $gte: options.minScore } } }]
      : []),
    {
      $project: {
        embedding: 0,  // never return raw embedding to client
      },
    },
  ];

  return MemoryEntry.aggregate<VectorSearchResult>(pipeline);
}
```

### 4.3 MongoDB Atlas Index Definition (reference only — set in Atlas UI)

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      },
      "userId": { "type": "filter" },
      "createdAt": { "type": "filter" },
      "themes": { "type": "filter" }
    }
  }
}
```

---

## 5. Agentic AI — Patterns and Rules

### 5.1 Agent Architecture

All agents live in `/agents/*.ts`. Each agent:
- Is a **pure async function** — no class instances
- Accepts a typed input and returns a typed output
- Uses **Vercel AI SDK `generateObject`** for structured extraction
- Is **independently testable** with no side effects in the core function
- Calls the DB or external APIs only through injected helpers (for testability)

### 5.2 Memory Agent

```typescript
// agents/memory-agent.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { MEMORY_EXTRACTION_PROMPT } from '@/lib/prompts';

const MemoryExtractionSchema = z.object({
  themes: z.array(z.string()).describe('Max 5 behavioural tags'),
  emotions: z.object({
    primary:   z.enum(['stress','excitement','regret','confidence','anxiety','relief','guilt','hope']),
    intensity: z.number().min(0).max(1),
    markers:   z.array(z.string()),
  }),
  decisionPoints: z.array(z.object({
    type:         z.enum(['investment','loan','purchase','gift','avoid','other']),
    amount:       z.number().optional(),
    currency:     z.string().optional(),
    counterparty: z.string().optional(),
    deadline:     z.string().optional(), // ISO date string
    summary:      z.string(),
  })),
  stressScore: z.number().min(0).max(1),
  summary:     z.string().max(200),
});

export type MemoryExtractionResult = z.infer<typeof MemoryExtractionSchema>;

export async function runMemoryAgent(
  transcript: string
): Promise<MemoryExtractionResult> {
  const { object } = await generateObject({
    model:  anthropic('claude-sonnet-4-20250514'),
    schema: MemoryExtractionSchema,
    system: MEMORY_EXTRACTION_PROMPT,
    prompt: transcript,
  });
  return object;
}
```

### 5.3 Pattern Agent

```typescript
// agents/pattern-agent.ts
// Receives last N memory entries, returns identified recurring patterns
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { PATTERN_ANALYSIS_PROMPT } from '@/lib/prompts';
import type { IMemoryEntry } from '@/models/MemoryEntry';

const PatternSchema = z.object({
  patterns: z.array(z.object({
    id:          z.string(),
    title:       z.string(),
    description: z.string(),
    occurrences: z.number(),
    lastSeen:    z.string(),     // ISO date
    severity:    z.enum(['low','medium','high']),
    triggerConditions: z.array(z.string()),
    historicalOutcomes: z.array(z.string()),
  })),
});

export type PatternAnalysisResult = z.infer<typeof PatternSchema>;

export async function runPatternAgent(
  entries: Pick<IMemoryEntry, 'createdAt' | 'summary' | 'themes' | 'emotions' | 'decisionPoints' | 'stressScore'>[]
): Promise<PatternAnalysisResult> {
  const { object } = await generateObject({
    model:  anthropic('claude-sonnet-4-20250514'),
    schema: PatternSchema,
    system: PATTERN_ANALYSIS_PROMPT,
    prompt: JSON.stringify(entries),
  });
  return object;
}
```

### 5.4 Trigger Agent

```typescript
// agents/trigger-agent.ts
// Given a new check-in, find matching historical patterns and decide whether to alert
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { TRIGGER_DETECTION_PROMPT } from '@/lib/prompts';

const TriggerSchema = z.object({
  shouldAlert: z.boolean(),
  urgency: z.enum(['low','medium','high','critical']).optional(),
  matchedPattern: z.object({
    id:          z.string(),
    title:       z.string(),
    similarity:  z.number(),
  }).optional(),
  alertMessage: z.string().optional(),  // KORA's proactive voice message text
  memoriestoReplay: z.array(z.string()).optional(), // IDs of entries to surface
});

export type TriggerResult = z.infer<typeof TriggerSchema>;

export async function runTriggerAgent(
  currentSummary: string,
  matchingPatterns: object[],
  relevantMemories: object[]
): Promise<TriggerResult> {
  const { object } = await generateObject({
    model:  anthropic('claude-sonnet-4-20250514'),
    schema: TriggerSchema,
    system: TRIGGER_DETECTION_PROMPT,
    prompt: JSON.stringify({ currentSummary, matchingPatterns, relevantMemories }),
  });
  return object;
}
```

### 5.5 Agent Orchestrator

```typescript
// lib/agent-runner.ts
// Runs agents in the correct order after a check-in is saved

import { runMemoryAgent }  from '@/agents/memory-agent';
import { runPatternAgent } from '@/agents/pattern-agent';
import { runTriggerAgent } from '@/agents/trigger-agent';
import { runEmotionAgent } from '@/agents/emotion-agent';
import { findSimilarMemories } from './vector-search';
import { embed } from './embeddings';
import { MemoryEntry } from '@/models/MemoryEntry';
import { Pattern }     from '@/models/Pattern';
import { TriggerAlert } from '@/models/TriggerAlert';

export async function runCheckinPipeline(
  userId: string,
  sessionId: string,
  transcript: string
) {
  // 1. Extract structured memory from transcript
  const extraction = await runMemoryAgent(transcript);

  // 2. Generate and store embedding
  const embedding = await embed(transcript);

  // 3. Save memory entry
  const entry = await MemoryEntry.create({
    userId,
    sessionId,
    transcript,
    embedding,
    ...extraction,
  });

  // 4. Find semantically similar past memories in parallel with emotion analysis
  const [similarMemories, emotionResult] = await Promise.all([
    findSimilarMemories(userId, transcript, { limit: 20, minScore: 0.75 }),
    runEmotionAgent(transcript, extraction.emotions),
  ]);

  // 5. Run pattern analysis on recent entries (last 90 days)
  const recentEntries = await MemoryEntry.find(
    { userId, createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    { embedding: 0 }
  ).sort({ createdAt: -1 }).limit(50);

  const patternResult = await runPatternAgent(recentEntries);

  // 6. Upsert patterns
  for (const pattern of patternResult.patterns) {
    await Pattern.findOneAndUpdate(
      { userId, 'pattern.id': pattern.id },
      { userId, pattern, updatedAt: new Date() },
      { upsert: true }
    );
  }

  // 7. Check triggers against current entry
  const triggerResult = await runTriggerAgent(
    extraction.summary,
    patternResult.patterns,
    similarMemories
  );

  // 8. Create alert if needed
  if (triggerResult.shouldAlert && triggerResult.urgency !== 'low') {
    await TriggerAlert.create({
      userId,
      entryId:       entry._id,
      patternId:     triggerResult.matchedPattern?.id,
      alertMessage:  triggerResult.alertMessage,
      urgency:       triggerResult.urgency,
      memoriestoReplay: triggerResult.memoriestoReplay,
      status:        'pending',
    });
  }

  return { entry, patterns: patternResult.patterns, trigger: triggerResult, emotion: emotionResult };
}
```

---

## 6. ElevenLabs Voice Integration

### 6.1 ElevenLabs Client

```typescript
// lib/elevenlabs.ts
const ELEVENLABS_API_KEY  = process.env.ELEVENLABS_API_KEY!;
const KORA_VOICE_ID       = process.env.ELEVENLABS_VOICE_ID!; // KORA's custom voice

export interface SynthesisOptions {
  stability?:         number; // 0–1, default 0.5
  similarity_boost?:  number; // 0–1, default 0.75
  style?:             number; // 0–1 ElevenLabs style exaggeration
  emotionalTone?:     'calm' | 'warm' | 'grounded' | 'urgent';
}

// Maps emotional context to ElevenLabs voice settings
const TONE_PRESETS: Record<NonNullable<SynthesisOptions['emotionalTone']>, Partial<SynthesisOptions>> = {
  calm:     { stability: 0.75, similarity_boost: 0.75, style: 0.1 },
  warm:     { stability: 0.55, similarity_boost: 0.80, style: 0.3 },
  grounded: { stability: 0.85, similarity_boost: 0.70, style: 0.05 },
  urgent:   { stability: 0.40, similarity_boost: 0.85, style: 0.5 },
};

export async function synthesizeSpeechStream(
  text: string,
  options: SynthesisOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const preset = options.emotionalTone ? TONE_PRESETS[options.emotionalTone] : {};
  const settings = { ...preset, ...options };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${KORA_VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key':   ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability:        settings.stability        ?? 0.5,
          similarity_boost: settings.similarity_boost ?? 0.75,
          style:            settings.style            ?? 0.2,
          use_speaker_boost: true,
        },
        output_format: 'mp3_44100_128',
      }),
    }
  );

  if (!response.ok || !response.body) {
    throw new Error(`ElevenLabs error: ${response.status}`);
  }

  return response.body;
}
```

### 6.2 Voice Synthesis Route

```typescript
// app/api/voice/synthesize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeechStream } from '@/lib/elevenlabs';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const RequestSchema = z.object({
  text:          z.string().min(1).max(5000),
  emotionalTone: z.enum(['calm','warm','grounded','urgent']).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = RequestSchema.parse(await req.json());

  const stream = await synthesizeSpeechStream(body.text, {
    emotionalTone: body.emotionalTone,
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### 6.3 useElevenLabsStream Hook

```typescript
// hooks/useElevenLabsStream.ts
'use client';
import { useRef, useState, useCallback } from 'react';

export function useElevenLabsStream() {
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const [playing, setPlaying] = useState(false);

  const speak = useCallback(async (
    text: string,
    emotionalTone?: 'calm' | 'warm' | 'grounded' | 'urgent'
  ) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;

    const response = await fetch('/api/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, emotionalTone }),
    });

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    sourceRef.current?.stop();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setPlaying(false);
    source.start();
    sourceRef.current = source;
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    setPlaying(false);
  }, []);

  return { speak, stop, playing };
}
```

---

## 7. Check-in Streaming Route (AI SDK)

```typescript
// app/api/checkin/route.ts
import { NextRequest }           from 'next/server';
import { streamText }            from 'ai';
import { anthropic }             from '@ai-sdk/anthropic';
import { auth }                  from '@/lib/auth';
import { findSimilarMemories }   from '@/lib/vector-search';
import { KORA_SYSTEM_PROMPT }    from '@/lib/prompts';
import { connectDB }             from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  await connectDB();

  const { messages, transcript } = await req.json();

  // Retrieve relevant memories for context injection
  const relevantMemories = transcript
    ? await findSimilarMemories(session.user.id, transcript, {
        limit: 5,
        minScore: 0.78,
      })
    : [];

  const memoryContext = relevantMemories.length
    ? `\n\n## Relevant memories from the user's past:\n${relevantMemories
        .map((m, i) => `[${i + 1}] ${m.createdAt.toISOString().slice(0, 10)}: ${m.summary}`)
        .join('\n')}`
    : '';

  const result = streamText({
    model:  anthropic('claude-sonnet-4-20250514'),
    system: KORA_SYSTEM_PROMPT + memoryContext,
    messages,
    maxTokens: 600,    // keep responses concise for voice
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
```

---

## 8. System Prompts — Rules

All prompts are **constants in `/lib/prompts.ts`**. Never inline prompts in route files.

```typescript
// lib/prompts.ts (excerpt — always add to this file)

export const KORA_SYSTEM_PROMPT = `
You are KORA, a voice-first financial memory agent. You speak to the user in a warm, 
unhurried voice — like a trusted advisor who has listened to them for years.

Rules:
- Keep responses under 120 words. This is voice output.
- Never give generic financial advice. Ground everything in what the user has said before.
- If relevant memories exist in context, reference them naturally without quoting them verbatim.
- When you detect stress or impulsivity, slow your tone down — use shorter sentences, more pauses.
- Never moralize. Reflect. Ask one question at most.
- You never touch banking systems, make transactions, or act on behalf of the user.
`.trim();

export const MEMORY_EXTRACTION_PROMPT = `
Extract structured financial memory data from a voice check-in transcript.
Be precise about decision points: amounts, counterparties, deadlines.
Classify emotional tone based on word choice, not just sentiment.
Themes should be behavioural labels (snake_case), not topics.
`.trim();

export const PATTERN_ANALYSIS_PROMPT = `
You are a behavioural analyst examining a sequence of financial journal entries.
Identify recurring patterns: same emotional triggers, same types of decisions, 
same outcomes. Focus on patterns that, if caught early, could prevent financial harm.
Severity: low = awareness only, medium = worth flagging, high = proactive alert warranted.
`.trim();

export const TRIGGER_DETECTION_PROMPT = `
Given a new check-in summary and a library of historical patterns,
determine whether the current situation closely matches a past pattern.
Only set shouldAlert=true if the match is specific and the historical outcome was negative.
The alertMessage must be KORA's voice — warm, non-alarmist, referencing the specific past event.
`.trim();
```

---

## 9. Coding Rules — Apply to Every File

### 9.0 Bun Runtime
- Use `bun` for all package management: `bun install`, `bun add`, `bun remove`.
- Use `bun run` instead of `npm run` / `node` for all scripts.
- Use `bunx` instead of `npx` for one-off executables.
- `package.json` scripts must use `bun` — e.g. `"dev": "bun run next dev"`.
- Bun's native `Bun.file()`, `Bun.write()`, and `Bun.serve()` are available but Next.js routing takes precedence — do not replace Next.js Route Handlers with raw `Bun.serve()`.
- Use `bun test` for running Vitest — Bun's test runner is compatible.
- Do **not** use `node:` prefix imports — use bare module specifiers; Bun resolves them natively.
- `Bun.env` is available but prefer `process.env` for Next.js compatibility.

### 9.1 TypeScript
- No `any`. Use `unknown` + type guards.
- All server actions and API routes must validate input with Zod.
- Use `satisfies` operator when narrowing schema types.
- Prefer `type` over `interface` for unions; use `interface` for extendable object shapes.

### 9.2 Next.js App Router
- Server Components by default. Add `'use client'` only when using hooks, event handlers, or browser APIs.
- Use `next/headers` `cookies()` and `headers()` in Server Components — never in Client Components.
- All data fetching in Server Components uses `fetch` with `cache: 'no-store'` for dynamic data.
- Route Handlers validate auth on every request via `await auth()`.

### 9.3 MongoDB / Mongoose
- Always call `await connectDB()` at the top of every API route and agent that touches the DB.
- Never return raw Mongoose documents to the client — use `.toObject()` or projection.
- Projection must exclude `embedding` field (`{ embedding: 0 }`) in all non-vector-search queries.
- Use transactions for multi-document writes.

### 9.4 AI SDK Streaming
- Use `toDataStreamResponse()` for streaming routes consumed by Vercel AI SDK `useChat`.
- Use `generateObject` (not `generateText` + manual JSON.parse) for all structured outputs.
- Pass `maxTokens` on every call. Voice responses: 600 max. Structured extractions: 1000 max.

### 9.5 ElevenLabs
- Always stream — never buffer full audio before playing.
- Respect the `emotionalTone` parameter — map user stress score to tone before calling.
- Log ElevenLabs character usage per user for billing awareness.

### 9.6 Security
- All user data queries must include `userId` from `session.user.id` — never trust client-supplied userId.
- Sanitize all transcript text before storing (strip PII patterns: card numbers, SSN, etc.).
- Rate-limit `/api/checkin` to 20 req/min per user via `@vercel/kv`.
- Never log transcripts or embeddings to console.

### 9.7 Error Handling
- Wrap all agentic calls in try/catch. Log structured errors with `{ userId, operation, error }`.
- Return `{ error: string }` with appropriate HTTP status from all API routes on failure.
- Graceful degradation: if pattern/trigger agents fail, still save the memory entry.

### 9.8 Naming
- Components: PascalCase (`VoiceRecorder.tsx`)
- Hooks: camelCase with `use` prefix (`useElevenLabsStream.ts`)
- Agents: kebab-case with `-agent` suffix (`memory-agent.ts`)
- DB models: PascalCase (`MemoryEntry.ts`)
- Env vars: `SCREAMING_SNAKE_CASE`

---

## 10. Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=
OPENAI_API_KEY=                  # embeddings + Whisper
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=             # KORA's custom voice ID

MONGODB_URI=                     # Atlas connection string
MONGODB_DB_NAME=kora

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

KV_URL=                          # Vercel KV for rate limiting + cron state
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

---

## 11. Cron Jobs — Scheduled Agent Tasks

```typescript
// app/api/webhooks/cron/route.ts
// Vercel Cron: "0 8 * * *" (8am daily per user timezone)
import { NextRequest, NextResponse } from 'next/server';
import { User }         from '@/models/User';
import { connectDB }    from '@/lib/mongodb';
import { runPatternAgent }  from '@/agents/pattern-agent';
import { runTriggerAgent }  from '@/agents/trigger-agent';
import { MemoryEntry }  from '@/models/MemoryEntry';

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({ 'settings.proactiveAlerts': true });

  for (const user of users) {
    try {
      const entries = await MemoryEntry.find(
        { userId: user._id, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } },
        { embedding: 0 }
      ).sort({ createdAt: -1 }).limit(50);

      if (entries.length < 3) continue;

      await runPatternAgent(entries);
      // Additional nightly enrichment tasks here
    } catch (err) {
      console.error({ userId: user._id, cron: 'daily-pattern', err });
    }
  }

  return NextResponse.json({ ok: true });
}
```

---

## 12. Testing Conventions

```typescript
// Example: agents/memory-agent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runMemoryAgent } from './memory-agent';

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      themes: ['impulse_purchase'],
      emotions: { primary: 'stress', intensity: 0.7, markers: ['rough week'] },
      decisionPoints: [],
      stressScore: 0.65,
      summary: 'User had a rough week and made impulse purchases.',
    },
  }),
}));

describe('runMemoryAgent', () => {
  it('extracts themes and emotions from transcript', async () => {
    const result = await runMemoryAgent('Had a rough week. Bought some stuff I didn\'t need.');
    expect(result.themes).toContain('impulse_purchase');
    expect(result.emotions.primary).toBe('stress');
    expect(result.stressScore).toBeGreaterThan(0.5);
  });
});
```

---

## 13. What Copilot Should Never Suggest

- Do **not** add functionality that executes real bank transactions, calls banking APIs, or accesses external financial accounts.
- Do **not** suggest storing raw audio recordings — only transcripts and embeddings.
- Do **not** use `fetch` for ElevenLabs without the streaming pattern above.
- Do **not** inline system prompts — always import from `/lib/prompts.ts`.
- Do **not** return `embedding` arrays to the client in any API response.
- Do **not** use the Pages Router (`/pages`).
- Do **not** use `useEffect` for data fetching — use Server Components or React Query.
- Do **not** suggest `mongoose.connect()` directly — always use the singleton in `/lib/mongodb.ts`.
- Do **not** use `any` type — suggest `unknown` + type narrowing instead.
- Do **not** hardcode voice or model IDs — always read from `process.env`.