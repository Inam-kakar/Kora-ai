export function sanitizeTranscript(transcript: string): string {
  return transcript
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[REDACTED_CARD]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
    .trim();
}
