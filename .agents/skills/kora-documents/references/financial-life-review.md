# Financial Life Review — Structure & Tone Guide

The Financial Life Review (FLR) is KORA's signature annual document.
It is the most personal output the system generates. Treat it as a letter
from a trusted advisor who has been listening all year — not a spreadsheet export.

---

## Document properties

- Format: Generate as `.docx`, then convert to `.pdf` for delivery
- Length: 8–14 pages (depends on data richness)
- Font: Georgia (serif) for body, Arial for headers — warmth over sterility
- Margins: 1.25" all sides — more breathing room than standard
- Accent colour: `#4F46E5` (indigo) for section dividers and pull quotes
- Page size: US Letter

---

## Cover page

```
[KORA wordmark — text only, centred]

Your Financial Life Review
[Year]

Prepared for [First Name]
[Date generated]

────────────────────────────────
"The only financial advisor that actually knows you —
because it has listened to you for [N] months."
────────────────────────────────
```

---

## Section order and content rules

### 1. A Note from KORA (1 page)

Opening letter, 3–4 paragraphs. Written in KORA's voice.
Pull 2–3 specific moments from the year (from MemoryEntry summaries) —
this proves KORA was listening. Never be generic.

Template opening:
> "This year, you came to me [N] times. You talked about stress, about hope,
> about decisions that kept you up at night and ones you're proud of.
> I've been holding all of it. Here's what I saw."

Avoid: generic financial advice, moralising, "you should have..."

---

### 2. Your Year in Numbers (1 page)

Stat card layout (generate as a table in the docx):

| Metric | Value |
|---|---|
| Check-ins completed | N |
| Decisions logged | N |
| Patterns identified | N |
| Average weekly stress score | X.X / 10 |
| Months with highest activity | [list] |
| Most common decision type | [type] |
| Alerts triggered | N |

Do not invent numbers — use only data from MemoryEntry/Pattern records.
If a metric is unavailable, omit the row rather than showing "N/A".

---

### 3. Key Decisions Made (1–2 pages)

Chronological list of significant `decisionPoints` from the year.
For each decision:
- Date and a one-line description
- Outcome (if `resolved: true` and `outcome` is set)
- 1–2 sentence reflection from KORA

Group into: Decisions you made · Decisions you chose NOT to make (avoided)

The "chose not to make" section is important — it credits the user for restraint.

---

### 4. Your Patterns This Year (1–2 pages)

For each `Pattern` with `severity: medium` or `high`:

**[Pattern Title]**
*First noticed: [date] · Appeared [N] times*

[2–3 sentence plain-language description of the pattern]

> "The moment I noticed this most clearly was [specific entry reference]."

End each pattern with: "Here's what you might watch for next year:" + 2 bullet points.

Cap at 4 patterns per review. If more exist, pick by severity then recency.

---

### 5. Your Emotional Financial Timeline (1 page)

A prose narrative walking through the year's emotional arc — not a chart.
Use stress score data to identify: low points, high points, turning points.

Structure: Opening state → First shift → [middle events] → Year-end state

Avoid clinical language. Use the user's own words where summaries allow it
(paraphrased — never verbatim transcripts).

---

### 6. Wins Worth Remembering (half page)

3–5 specific positive moments. Keep it short — this section should feel like
finding a note you wrote to yourself.

Lead each item with a date and a title, then one sentence.

Example:
> **March 14** — Said no to the loan request
> You felt guilty for weeks, but you held the line.

---

### 7. Moments of Vulnerability (half page)

2–3 moments where the user struggled or made a decision they later questioned.
Frame with compassion — never judgment.

Opening line: "These aren't failures. They're data."

Each item: date, what happened (brief), what it revealed about a pattern or trigger.

---

### 8. A Letter to Next Year's You (1 page)

Written as if KORA is addressing the user one year from now.
Reference: one unresolved decision, one pattern to watch, one strength to lean on.

This is the most personal section. Spend the most care here.
It should feel like something the user will want to re-read.

---

### 9. Goals You Mentioned (half page)

Goals the user explicitly mentioned in check-ins (extracted from transcripts).
List them exactly as stated (paraphrased, not verbatim) — do not add new goals.
Group by: Financial · Personal · Relational

---

## Tone guide

| Situation | Voice |
|---|---|
| Reviewing a mistake | Warm, curious, never judgmental |
| Highlighting a win | Genuine, specific, not cheerleader-ish |
| Describing a pattern | Clinical enough to be credible, human enough to land |
| Proactive warning | Grounded, slow, like a trusted friend who has seen this before |
| Year-end reflection | Tender, unhurried, specific |

Words to avoid: "should", "mistake", "failure", "wrong", "bad decision"
Words to use: "pattern", "noticed", "chose", "held the line", "showed up", "remembered"

---

## docx generation notes

- Use Georgia 11pt for body text — warmer than Arial for this document type
- Pull quote style (KORA memory playbacks): indented 0.75", italic, `#4F46E5` left border
- Section dividers: thin indigo rule (Paragraph border-bottom, `#4F46E5`, 1pt)
- Page numbers: footer, centred, format "— X —"
- No table of contents — the document is meant to be read linearly
- Cover page is its own section (no page number)
