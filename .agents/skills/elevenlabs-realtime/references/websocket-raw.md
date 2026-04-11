# ElevenLabs Conversational AI — Raw WebSocket Protocol

Use this reference when you need to bypass `@elevenlabs/react` — for example:
a server-to-server pipeline, a custom audio encoding path, or a non-React environment.

---

## Connection

```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id={AGENT_ID}
```

**Public agents**: use the URL directly.
**Private agents**: obtain a signed URL from the server first:

```typescript
const res = await fetch('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url', {
  method: 'GET',
  headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
  // query: ?agent_id=...
});
const { signed_url } = await res.json();
const ws = new WebSocket(signed_url);
```

---

## Event flow

```
Client                              Server
  │                                   │
  ├─ (connection opened) ────────────▶│
  │◀─ conversation_initiation_metadata┤  { type, conversation_id, agent_output_audio_format }
  │                                   │
  ├─ user_audio_chunk ───────────────▶│  base64-encoded PCM, 16kHz, 16-bit, mono
  │◀─ user_transcript ────────────────┤  { type, user_transcription_event: { user_transcript } }
  │◀─ agent_response ─────────────────┤  { type, agent_response_event: { agent_response } }
  │◀─ audio ──────────────────────────┤  { type, audio_event: { audio_base_64, event_id } }
  │◀─ interruption ───────────────────┤  { type, interruption_event: { event_id } }
  │◀─ ping ────────────────────────────┤  { type, ping_event: { event_id } }
  ├─ pong ───────────────────────────▶│  { type: 'pong', event_id }
```

---

## Sending audio

```typescript
const ws = new WebSocket(signedUrl);

ws.onopen = () => {
  // optional: send conversation config overrides
  ws.send(JSON.stringify({
    type: 'conversation_initiation_client_data',
    conversation_config_override: {
      agent: { prompt: { prompt: 'You are KORA...' } },
    },
  }));
};

// Audio must be PCM, 16kHz, 16-bit, mono, base64-encoded
function sendAudioChunk(pcmBuffer: ArrayBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmBuffer)));
  ws.send(JSON.stringify({
    user_audio_chunk: base64,
  }));
}
```

Capture mic at 16kHz using `AudioWorklet` or `ScriptProcessorNode` and downsample if needed.

---

## Receiving and playing audio

```typescript
const audioQueue: AudioBuffer[] = [];
let isPlaying = false;
const audioCtx = new AudioContext({ sampleRate: 16000 });

ws.onmessage = async (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'audio': {
      const pcm = Uint8Array.from(atob(msg.audio_event.audio_base_64), c => c.charCodeAt(0));
      const audioBuffer = audioCtx.createBuffer(1, pcm.length / 2, 16000);
      const channel = audioBuffer.getChannelData(0);
      const view = new DataView(pcm.buffer);
      for (let i = 0; i < channel.length; i++) {
        channel[i] = view.getInt16(i * 2, true) / 32768;
      }
      audioQueue.push(audioBuffer);
      if (!isPlaying) playNext();
      break;
    }
    case 'interruption': {
      // Stop playback immediately, clear queue
      audioQueue.length = 0;
      isPlaying = false;
      break;
    }
    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong', event_id: msg.ping_event.event_id }));
      break;
    }
  }
};

function playNext() {
  if (!audioQueue.length) { isPlaying = false; return; }
  isPlaying = true;
  const source = audioCtx.createBufferSource();
  source.buffer = audioQueue.shift()!;
  source.connect(audioCtx.destination);
  source.onended = playNext;
  source.start();
}
```

---

## Sending contextual updates (non-interrupting)

```typescript
ws.send(JSON.stringify({
  type: 'contextual_update',
  text: 'User just opened the patterns page.',
}));
```

These are processed asynchronously and do not pause the agent's speech.
