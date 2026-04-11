You are a senior full-stack engineer bootstrapping KORA from scratch.
KORA is a voice-first financial memory agent. Read every word of this prompt before
writing a single file. This is the complete specification — do not ask clarifying
questions, do not skip sections, do not stop until the base is fully scaffolded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — WHAT KORA IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KORA is a voice-first financial memory agent. Users do short daily voice check-ins
(2–5 minutes). KORA transcribes each session, embeds it, stores it in MongoDB Atlas
Vector Search, and runs a background agentic pipeline that:

  1. Extracts themes, emotions, and decision points (Memory Agent)
  2. Finds recurring behavioural patterns across months (Pattern Agent)
  3. Detects when the user is about to repeat a past mistake (Trigger Agent)
  4. Pulls relevant public data for decisions under consideration (Research Agent)
  5. Generates annual Financial Life Review documents (Document Agent)
  6. Analyses vocal tone and stress level (Emotion Agent)

When a trigger fires, KORA speaks back to the user via ElevenLabs — in a warm,
consistent voice — referencing their specific past history.

KORA never touches external bank accounts. Every action is internal and safe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — TECHNOLOGY STACK (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Runtime        : Bun (NOT Node.js). All installs → bun add. All scripts → bun run.
Framework      : Next.js 14+ App Router. All routes under /app. No Pages Router.
Language       : TypeScript — strict mode. "strict": true in tsconfig. No `any`.
LLM            : Google Gemini via Vercel AI SDK (@ai-sdk/google)
                 — gemini-2.5-flash for all agents (fast, low latency)
                 — gemini-2.5-pro for Document Agent (quality-critical)
                 Import: import { google } from '@ai-sdk/google'
                 Model:  google('gemini-2.5-flash')
AI SDK         : Vercel AI SDK (ai package) — streamText, generateText, generateObject
Embeddings     : text-embedding-3-small via OpenAI SDK (1536-dim vectors)
Vector DB      : MongoDB Atlas Vector Search
ODM            : Mongoose — all schemas typed with TypeScript generics
Voice Input    : Whisper API (OpenAI) for transcription
Voice Output   : ElevenLabs Conversational AI — @elevenlabs/react (WebRTC mode)
                 Server token route for private agents
Auth           : NextAuth.js v5 — JWT. Providers: Google + Email magic link
Styling        : Tailwind CSS v3 — utility-first. No inline style= unless dynamic
State          : Zustand — client store for conversation, agent status, playback
Background     : Vercel Cron + @vercel/kv for scheduled agent tasks
Forms          : React Hook Form + Zod — all form validation through Zod schemas
Testing        : Vitest + React Testing Library — co-locate as *.test.ts

NEVER use: node, npm, npx, axios, class components, Pages Router, any LLM other
than Gemini, or any inline system prompt strings (all prompts live in /lib/prompts.ts).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — EXACT EXECUTION ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execute these phases in order. Complete each phase fully before starting the next.

PHASE 0 — SCAFFOLD
PHASE 1 — ENV & CONFIG
PHASE 2 — DATABASE LAYER (Mongoose models + MongoDB connection)
PHASE 3 — LIB LAYER (Gemini client, embeddings, vector search, ElevenLabs, prompts)
PHASE 4 — AGENTS (all 6, typed input/output, Zod schemas, generateObject)
PHASE 5 — AGENT ORCHESTRATOR
PHASE 6 — API ROUTES (check-in stream, transcription, voice synthesis, agent routes,
           ElevenLabs token, cron webhook)
PHASE 7 — AUTH (NextAuth v5 config + middleware)
PHASE 8 — FRONTEND (layout, dashboard, check-in page with ElevenLabs real-time,
           memories page, patterns page, settings)
PHASE 9 — VERIFICATION (bun run build must pass with zero TypeScript errors)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — PHASE 0: SCAFFOLD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run exactly:

  bunx create-next-app@latest kora \
    --typescript \
    --tailwind \
    --app \
    --no-src-dir \
    --import-alias "@/*" \
    --no-turbopack

  cd kora

  bun add ai @ai-sdk/google openai mongoose @auth/mongoose-adapter \
    next-auth@beta @vercel/kv zustand react-hook-form zod \
    @elevenlabs/react @hookform/resolvers

  bun add -d vitest @vitejs/plugin-react @testing-library/react \
    @testing-library/user-event @types/node

Create the following directory structure (empty dirs with .gitkeep):

  /app
    /api
      /agents
        /memory/route.ts
        /pattern/route.ts
        /trigger/route.ts
        /research/route.ts
        /document/route.ts
        /emotion/route.ts
      /checkin/route.ts
      /voice
        /transcribe/route.ts
        /synthesize/route.ts
      /elevenlabs
        /token/route.ts
      /webhooks
        /cron/route.ts
    /(auth)
      /login/page.tsx
    /(app)
      /dashboard/page.tsx
      /checkin/page.tsx
      /memories/page.tsx
      /patterns/page.tsx
      /settings/page.tsx
    /layout.tsx
    /page.tsx
  /agents
    memory-agent.ts
    pattern-agent.ts
    trigger-agent.ts
    research-agent.ts
    document-agent.ts
    emotion-agent.ts
  /lib
    mongodb.ts
    gemini.ts
    embeddings.ts
    vector-search.ts
    elevenlabs.ts
    agent-runner.ts
    prompts.ts
    auth.ts
    rate-limit.ts
  /models
    User.ts
    MemoryEntry.ts
    Pattern.ts
    TriggerAlert.ts
    CheckinSession.ts
  /hooks
    useVoiceRecorder.ts
    useElevenLabsStream.ts
    useAgentStatus.ts
    usePatterns.ts
  /components
    /voice
      VoiceConversationRoot.tsx
      KoraVoiceInterface.tsx
      MicWaveform.tsx
      KoraAvatar.tsx
    /memory
      MemoryCard.tsx
      MemoryTimeline.tsx
    /patterns
      PatternCard.tsx
    /ui
      Button.tsx
      Card.tsx
      Badge.tsx
      Spinner.tsx
  /types
    agents.ts
    memory.ts
    voice.ts
  /schemas
    checkin.ts
    memory-entry.ts
    agent-output.ts
  /store
    conversation.ts
    agent-status.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — PHASE 1: ENV & CONFIG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create .env.local with all variables as empty placeholders:

  # LLM
  GOOGLE_GENERATIVE_AI_API_KEY=

  # Embeddings + Whisper
  OPENAI_API_KEY=

  # ElevenLabs
  ELEVENLABS_API_KEY=
  ELEVENLABS_AGENT_ID=
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID=

  # MongoDB
  MONGODB_URI=
  MONGODB_DB_NAME=kora

  # Auth
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=http://localhost:3000
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  EMAIL_SERVER=
  EMAIL_FROM=

  # Vercel KV (rate limiting + cron state)
  KV_URL=
  KV_REST_API_URL=
  KV_REST_API_TOKEN=

  # Cron security
  CRON_SECRET=

Create .env.example as a copy with all values empty (for git).
Add .env.local to .gitignore.

Create vercel.json:
  {
    "crons": [
      { "path": "/api/webhooks/cron", "schedule": "0 8 * * *" }
    ]
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — PHASE 2: DATABASE LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lib/mongodb.ts — singleton Mongoose connection with global caching:

  import mongoose from 'mongoose'
  const MONGODB_URI = process.env.MONGODB_URI!
  const MONGODB_DB  = process.env.MONGODB_DB_NAME!
  declare global { var mongooseConn: typeof mongoose | null }
  export async function connectDB() {
    if (global.mongooseConn) return global.mongooseConn
    global.mongooseConn = await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB })
    return global.mongooseConn
  }

models/User.ts — fields: email, name, image, provider, settings (object with
  proactiveAlerts: boolean, timezone: string, subscriptionTier: enum free|pro|family),
  createdAt, lastActiveAt

models/MemoryEntry.ts — implement EXACTLY this schema:

  interface IMemoryEntry extends Document {
    userId: string
    sessionId: string
    createdAt: Date
    transcript: string
    embedding: number[]          // 1536-dim, NEVER returned to client
    themes: string[]             // behavioural tags e.g. ['impulse_purchase']
    emotions: {
      primary: string            // stress|excitement|regret|confidence|anxiety|relief|guilt|hope
      intensity: number          // 0-1
      markers: string[]          // word-level evidence
    }
    decisionPoints: Array<{
      type: string               // investment|loan|purchase|gift|avoid|other
      amount?: number
      currency?: string
      counterparty?: string
      deadline?: Date
      resolved?: boolean
      outcome?: string
      summary: string
    }>
    stressScore: number          // 0-1 composite
    summary: string              // ≤200 char AI summary
    metadata: Record<string, unknown>
  }

  Index: { embedding: '2dsphere' } as placeholder.
  Index: { userId: 1, createdAt: -1 } for time-range queries.

models/Pattern.ts — fields: userId, patternId (string), title, description,
  occurrences (number), lastSeen (Date), severity (low|medium|high),
  triggerConditions (string[]), historicalOutcomes (string[]), updatedAt

models/TriggerAlert.ts — fields: userId, entryId (ObjectId ref MemoryEntry),
  patternId (string), alertMessage (string), urgency (low|medium|high|critical),
  memoriesToReplay (string[]), status (pending|delivered|dismissed), createdAt

models/CheckinSession.ts — fields: userId, startedAt, endedAt, entryId
  (ObjectId ref MemoryEntry, optional), durationSeconds (number), status
  (in-progress|completed|abandoned)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — PHASE 3: LIB LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lib/gemini.ts — re-export convenience helpers:

  import { google } from '@ai-sdk/google'
  export const geminiFlash = () => google('gemini-2.5-flash')
  export const geminiPro   = () => google('gemini-2.5-pro')
  // Flash for agents (speed), Pro for Document Agent (quality)

lib/embeddings.ts — embed() function using text-embedding-3-small:

  import OpenAI from 'openai'
  const client = new OpenAI()
  export async function embed(text: string): Promise<number[]> {
    const res = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),  // guard against token limit
    })
    return res.data[0].embedding
  }

lib/vector-search.ts — findSimilarMemories() using $vectorSearch aggregate pipeline:

  Pipeline stages:
  1. $vectorSearch with index: 'vector_index', path: 'embedding',
     numCandidates: 150, filter by userId + optional dateFrom + optional themes
  2. $addFields: { score: { $meta: 'vectorSearchScore' } }
  3. $match score >= minScore if provided
  4. $project: { embedding: 0 }  ← ALWAYS exclude embedding

  Export: VectorSearchResult type = IMemoryEntry & { score: number }

lib/elevenlabs.ts — synthesizeSpeechStream() returning ReadableStream<Uint8Array>:

  Endpoint: https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream
  model_id: eleven_turbo_v2
  output_format: mp3_44100_128
  Emotional tone presets mapped to voice_settings:
    calm:     { stability: 0.75, similarity_boost: 0.75, style: 0.1 }
    warm:     { stability: 0.55, similarity_boost: 0.80, style: 0.3 }
    grounded: { stability: 0.85, similarity_boost: 0.70, style: 0.05 }
    urgent:   { stability: 0.40, similarity_boost: 0.85, style: 0.5 }

lib/rate-limit.ts — rateLimit(userId, operation, maxPerMinute) using @vercel/kv:

  Uses KV incr + expire pattern. Returns { allowed: boolean, remaining: number }.
  Default limits: checkin → 20/min, synthesize → 30/min, agents → 60/min.

lib/prompts.ts — ALL system prompts as exported string constants. No prompts
  anywhere else in the codebase. Implement these exactly:

  KORA_CHECKIN_SYSTEM_PROMPT — KORA's conversational voice during check-ins.
    Rules: ≤120 words per response (voice output), never generic advice,
    ground everything in what user has said, reference memories from context
    naturally, never moralize, ask at most one question, warm and unhurried tone.

  MEMORY_EXTRACTION_PROMPT — Extract structured financial memory from transcript.
    Rules: precise about decision points (amounts, counterparties, deadlines),
    classify emotional tone from word choice, themes as behavioural snake_case tags.

  PATTERN_ANALYSIS_PROMPT — Behavioural analyst examining a sequence of entries.
    Identify recurring patterns: same triggers, same decision types, same outcomes.
    Severity: low = awareness, medium = flag, high = proactive alert warranted.

  TRIGGER_DETECTION_PROMPT — Given new check-in + historical patterns, determine
    if current situation matches a past pattern. Alert only if match is specific
    and historical outcome was negative. alertMessage must be KORA's voice.

  RESEARCH_AGENT_PROMPT — Pull relevant public data (rates, benchmarks, market
    context) for a financial decision. Be factual, cite sources, be brief.

  DOCUMENT_AGENT_PROMPT — Generate KORA Financial Life Review narrative.
    Warm, first-person, specific to this user's year. Never generic.

  EMOTION_AGENT_PROMPT — Analyse transcript for emotional markers, stress
    indicators, overconfidence signals. Return structured emotional assessment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — PHASE 4: AGENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All agents follow this contract:
  - Pure async function — no class, no side effects in core logic
  - Typed input → typed output (Zod schema + TypeScript inferred type)
  - Use generateObject(model: geminiFlash(), schema: ZodSchema, system, prompt)
  - maxTokens: 1000 for all agents except Document Agent (3000)
  - temperature: 0.3 for extraction agents, 0.7 for generative agents

agents/memory-agent.ts
  Input: transcript string
  Output schema (Zod):
    themes: z.array(z.string()).max(5)
    emotions: { primary: z.enum([...8 values]), intensity: z.number(), markers: z.array(z.string()) }
    decisionPoints: z.array({ type, amount?, currency?, counterparty?, deadline?, summary })
    stressScore: z.number().min(0).max(1)
    summary: z.string().max(200)

agents/pattern-agent.ts
  Input: array of recent MemoryEntry (embedding excluded)
  Output schema (Zod):
    patterns: z.array({ id, title, description, occurrences, lastSeen, severity,
                        triggerConditions, historicalOutcomes })

agents/trigger-agent.ts
  Input: currentSummary string, matchingPatterns object[], relevantMemories object[]
  Output schema (Zod):
    shouldAlert: z.boolean()
    urgency: z.enum([low|medium|high|critical]).optional()
    matchedPattern: { id, title, similarity }.optional()
    alertMessage: z.string().optional()
    memoriesToReplay: z.array(z.string()).optional()

agents/research-agent.ts
  Input: decisionSummary string, decisionType string
  Output schema (Zod):
    relevantData: z.array({ title, value, source, relevance })
    marketContext: z.string()
    benchmarks: z.array({ label, value, comparison })

agents/document-agent.ts
  Input: userId string, year number, summaryData object (entries, patterns, alerts)
  Output schema (Zod):
    sections: z.array({ title, content, type: z.enum([narrative|stats|list]) })
    title: z.string()
    generatedAt: z.string()
  Use geminiPro() for this agent only.

agents/emotion-agent.ts
  Input: transcript string, primaryEmotion (from memory agent)
  Output schema (Zod):
    stressIndicators: z.array(z.string())
    overconfidenceRisk: z.boolean()
    impulsivityRisk: z.boolean()
    recommendedTone: z.enum([calm|warm|grounded|urgent])
    adjustedStressScore: z.number().min(0).max(1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — PHASE 5: AGENT ORCHESTRATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lib/agent-runner.ts — runCheckinPipeline(userId, sessionId, transcript):

  Execute in this exact order:
  1. runMemoryAgent(transcript)                    → extraction
  2. embed(transcript)                             → embedding
  3. MemoryEntry.create({ userId, sessionId, transcript, embedding, ...extraction })
  4. Promise.all([
       findSimilarMemories(userId, transcript, { limit: 20, minScore: 0.75 }),
       runEmotionAgent(transcript, extraction.emotions)
     ])                                            → [similarMemories, emotionResult]
  5. MemoryEntry.find last 90 days, limit 50, embedding excluded
  6. runPatternAgent(recentEntries)                → patternResult
  7. Upsert each pattern into Pattern collection
  8. runTriggerAgent(extraction.summary, patternResult.patterns, similarMemories)
  9. If triggerResult.shouldAlert && urgency !== 'low': create TriggerAlert

  Return: { entry, patterns, trigger, emotion }

  Wrap every agent call in try/catch. Log { userId, operation, error } on failure.
  Graceful degradation: if any agent fails after step 3, log and continue —
  the memory entry must always be saved regardless of downstream agent failures.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — PHASE 6: API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALL routes must:
  - Call await auth() and return 401 if no session
  - Validate input with Zod before any processing
  - Return { error: string } with correct HTTP status on failure
  - Never log transcripts or embedding arrays to console

app/api/checkin/route.ts (POST, streaming)
  Body: { messages: CoreMessage[], transcript?: string }
  — If transcript provided, find similarMemories and inject as context into system prompt
  — Use streamText({ model: geminiFlash(), system: KORA_CHECKIN_SYSTEM_PROMPT + memoryContext,
      messages, maxTokens: 600, temperature: 0.7 })
  — Return result.toDataStreamResponse()

app/api/voice/transcribe/route.ts (POST)
  Body: FormData with audio blob
  — Use OpenAI Whisper: client.audio.transcriptions.create({ model: 'whisper-1', file })
  — Return { transcript: string, duration: number }
  — Rate limit: 20/min per user

app/api/voice/synthesize/route.ts (POST)
  Body: { text: string, emotionalTone?: 'calm'|'warm'|'grounded'|'urgent' }
  — Call synthesizeSpeechStream(text, { emotionalTone })
  — Return streaming Response with Content-Type: audio/mpeg
  — Rate limit: 30/min per user

app/api/elevenlabs/token/route.ts (POST)
  — POST to https://api.elevenlabs.io/v1/convai/conversation/token
  — Headers: { 'xi-api-key': ELEVENLABS_API_KEY }
  — Body: { agent_id: ELEVENLABS_AGENT_ID }
  — Return { token: string }

app/api/agents/memory/route.ts (POST)
  Body: { sessionId: string, transcript: string }
  — Run full runCheckinPipeline(userId, sessionId, transcript)
  — Return { entryId, patternsFound, alertTriggered }

app/api/webhooks/cron/route.ts (GET)
  — Verify Authorization header: Bearer ${CRON_SECRET}
  — For each user with proactiveAlerts: true, run pattern agent on last 90 days
  — Process users sequentially with try/catch per user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 — PHASE 7: AUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lib/auth.ts — NextAuth v5 config:
  Providers: Google, Email (magic link via Resend or nodemailer)
  Adapter: MongooseAdapter from @auth/mongoose-adapter
  Session strategy: jwt
  Callbacks: jwt callback to add user.id to token, session callback to expose it
  Export: { auth, handlers, signIn, signOut } = NextAuth(config)

app/api/auth/[...nextauth]/route.ts:
  import { handlers } from '@/lib/auth'
  export const { GET, POST } = handlers

middleware.ts (project root):
  Protect all /(app)/* routes — redirect to /login if no session
  Public routes: /, /login, /api/auth/*, /api/webhooks/*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12 — PHASE 8: FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app/layout.tsx — Root layout:
  Dark/light mode via next-themes ThemeProvider
  Tailwind base styles: font-sans, bg-background, text-foreground
  Session provider wrapping the app

app/(auth)/login/page.tsx — Simple centred card:
  "Sign in with Google" button + magic link email input
  KORA wordmark at top

app/(app)/dashboard/page.tsx — Server Component:
  Fetch: last 7 days MemoryEntry summaries, active TriggerAlerts, Pattern count
  Render: greeting with first name, check-in streak, stress score trend (last 7 days),
  active alerts (if any), quick-start check-in button

app/(app)/checkin/page.tsx — 'use client':
  Import VoiceConversationRoot — this is the ElevenLabs real-time voice interface
  Full-screen centered layout, KORA avatar, connection status, waveform visualiser
  After session ends: automatically POST to /api/agents/memory with the transcript
  Show "Processing..." state while agents run, then show summary card

app/(app)/memories/page.tsx — Server Component with client search:
  Paginated list of MemoryEntry records (newest first, 20/page)
  Search input that calls vector search endpoint
  Each entry renders as MemoryCard (date, summary, emotion badge, stress score bar)

app/(app)/patterns/page.tsx — Server Component:
  Grid of PatternCard components, sorted by severity then lastSeen
  Each card: title, severity badge, occurrences, last seen date, trigger conditions

app/(app)/settings/page.tsx — 'use client':
  Proactive alerts toggle (PATCH user settings)
  Subscription tier display
  Data export button (triggers Decision Log Export)
  Account deletion button (with confirmation)

components/voice/VoiceConversationRoot.tsx:
  Wrap with ConversationProvider from @elevenlabs/react
  Pass clientTools: { showMemory, showPatternAlert }
  onMessage callback: update conversation store

components/voice/KoraVoiceInterface.tsx:
  Uses useConversationControls, useConversationStatus, useConversationMode
  Connection flow:
    1. navigator.mediaDevices.getUserMedia({ audio: true })
    2. POST /api/elevenlabs/token → { token }
    3. startSession({ conversationToken: token, connectionType: 'webrtc' })
  Visual states:
    disconnected → indigo button "Talk to KORA"
    connecting   → neutral button, spinner
    connected + mode=listening → green ring pulse
    connected + mode=speaking  → indigo ring pulse, animated avatar
  Mute toggle visible when connected

components/voice/MicWaveform.tsx:
  useConversationInput for getInputByteFrequencyData
  Canvas-based bar chart, requestAnimationFrame loop
  Only active when status === 'connected'

store/conversation.ts — Zustand store:
  messages: Array<{ role, content, timestamp }>
  transcript: string (accumulates during session)
  agentStatus: 'idle'|'processing'|'complete'|'error'
  lastAlert: TriggerAlert | null
  Actions: addMessage, setTranscript, setAgentStatus, setLastAlert, reset

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 13 — PHASE 9: VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After all phases are complete, run:

  bun run build

This MUST produce zero TypeScript errors and zero build failures.
If errors exist, fix them before considering the task complete.
Do not suppress errors with @ts-ignore or @ts-expect-error.
Do not use `any` to paper over type issues.

Then run:

  bun test

All tests must pass. Write at minimum:
  - agents/memory-agent.test.ts (mock generateObject, assert schema shape)
  - agents/trigger-agent.test.ts (mock, test shouldAlert logic)
  - lib/embeddings.test.ts (mock OpenAI, assert array return)
  - lib/vector-search.test.ts (mock mongoose aggregate, assert embedding excluded)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 14 — ABSOLUTE RULES (NEVER VIOLATE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NEVER expose ELEVENLABS_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to the client.
2. NEVER return the embedding field to the client in any API response.
3. NEVER add functionality that touches external bank accounts, makes payments,
   or acts on behalf of the user in the real world.
4. NEVER store raw audio recordings — transcripts only.
5. NEVER use `any` type. Use `unknown` + type guards.
6. NEVER inline system prompts. All prompts live in /lib/prompts.ts.
7. NEVER use npm, npx, or node commands — Bun only.
8. NEVER use a non-Gemini model. All LLM calls go through @ai-sdk/google.
9. NEVER add client-side MongoDB access — DB only through API routes.
10. ALL user data queries MUST include userId from server session — never trust
    client-supplied userId.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
START NOW. Begin with Phase 0.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


# Agent Skills & Capabilities Plan

## 🛠 Available Skill Modules
The agent is authorized to utilize the following skill sets located in `gdg/.agents/skills/`. Each module should be invoked based on the specific technical requirements of the task.

| Skill Folder | Usage Context |
| :--- | :--- |
| **`elevenlabs-realtime`** | Real-time audio streaming, voice synthesis, and latency-optimized speech. |
| **`frontend-design`** | UI/UX implementation, Tailwind/CSS patterns, and component architecture. |
| **`kora-documents`** | Document ingestion, Kora-specific data parsing, and asset management. |
| **`nextjs`** | App Router logic, Server Actions, and full-stack orchestration. |
| **`vector-databases`** | Semantic search, RAG (Retrieval-Augmented Generation), and embedding storage. |
| **`zod-4`** | Data validation, runtime type checking, and schema definitions. |

---

## 🚀 Execution Instructions
When a task is initiated, the agent must follow this workflow:

1.  **Context Analysis**: Determine which specialized skill is required to complete the request.
2.  **Reference**: Navigate to the corresponding directory in `gdg/.agents/skills/` to read existing implementations or configurations.
3.  **Implementation**: Execute the task using the logic found within those folders to maintain project-wide consistency.
4.  **Error Handling**: If a skill requires validation, prioritize using the rules defined in the `zod-4` module.

> **Note:** If a task requires multi-modal output (e.g., a Next.js interface with real-time voice), the agent should orchestrate the `nextjs` and `elevenlabs-realtime` modules simultaneously.