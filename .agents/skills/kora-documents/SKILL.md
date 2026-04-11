---
name: kora-documents
description: >
  Generate any legal or financial document, report, or file for the KORA financial
  memory agent app. Use this skill whenever the user asks for a contract, NDA,
  agreement, terms of service, privacy policy, loan document, financial report,
  balance sheet, P&L statement, budget forecast, investment analysis, pitch deck,
  Financial Life Review, pattern report, or any other legal or financial output —
  in any format: Word (.docx), PDF, Excel (.xlsx), or PowerPoint (.pptx).
  Also triggers for: "generate a report", "create a document", "export to PDF",
  "build a financial model", "make a template", "draft an agreement", "produce
  a statement", "annual review", or any request that combines a legal/financial
  topic with a file format. Always use this skill before writing document code
  from scratch — it provides field-specific content rules and format routing.
---

# KORA — Legal & Financial Document Generation

This skill routes every document request to the correct format skill, then applies
legal/financial content rules on top. Two decisions drive everything:

1. **What domain?** → determines content structure (section 3)
2. **What format?** → determines which sub-skill to load (section 2)

---

## 1. Decision tree — read this first

```
User requests a document
        │
        ▼
 What format is requested?
  ├── Word / .docx / "download", "letter", "contract", "agreement"
  │     → Read /mnt/skills/public/docx/SKILL.md  THEN apply section 3
  │
  ├── PDF / "signed copy", "non-editable", "fillable form"
  │     → Read /mnt/skills/public/pdf/SKILL.md  THEN apply section 3
  │
  ├── Excel / .xlsx / "spreadsheet", "model", "tracker", "forecast", "P&L", "balance sheet"
  │     → Read /mnt/skills/public/xlsx/SKILL.md  THEN apply section 3
  │
  ├── PowerPoint / .pptx / "deck", "slides", "presentation", "pitch"
  │     → Read /mnt/skills/public/pptx/SKILL.md  THEN apply section 3
  │
  └── Format not specified
        → Default: .docx for legal/narrative docs, .xlsx for financial models,
          .pptx for reports meant to be presented, .pdf for final delivery
```

**Always load the sub-skill BEFORE writing any code.** The sub-skills contain
critical tooling details (docx-js quirks, xlsx color rules, pptxgenjs API) that
will break output if skipped.

---

## 2. Format sub-skills quick reference

| Format | Sub-skill path | Key tool |
|---|---|---|
| `.docx` | `/mnt/skills/public/docx/SKILL.md` | `docx` npm package (Node/Bun) |
| `.pdf` | `/mnt/skills/public/pdf/SKILL.md` | `pypdf`, `reportlab`, or docx→PDF via LibreOffice |
| `.xlsx` | `/mnt/skills/public/xlsx/SKILL.md` | `openpyxl` (Python) |
| `.pptx` | `/mnt/skills/public/pptx/SKILL.md` | `pptxgenjs` (Node/Bun) |

For PDF output of a narrative document (contract, report, letter): generate `.docx`
first using the docx sub-skill, then convert via LibreOffice:
```bash
python scripts/office/soffice.py --headless --convert-to pdf document.docx
```

---

## 3. Domain catalogue — content rules per document type

Read the relevant section for the document being generated.
For multi-domain requests (e.g. "a financial report with a legal disclaimer"),
apply both sets of rules.

### 3A. KORA-Specific Documents

Documents native to the KORA app. These are the highest-priority document types.

**Financial Life Review** (annual, PDF or DOCX)
- See `references/financial-life-review.md` for full structure and tone guide
- Narrative document, NOT a spreadsheet — warm, first-person framing
- Sections: Year in Review · Key Decisions Made · Patterns Identified · Emotional
  Financial Timeline · Wins · Moments of Vulnerability · Goals for Next Year
- Pull data from: `MemoryEntry` summaries, `Pattern` records, `TriggerAlert` history
- Tone: KORA's voice — warm, non-judgmental, specific to this user's history
- Format: `.pdf` (for download/archive) generated from `.docx` source
- Never include raw transcript text — only processed summaries

**Pattern Report** (on-demand, PDF or DOCX)
- Title: "Your [Pattern Name] Pattern — [Date Range]"
- Sections: What the pattern is · When it first appeared · Trigger conditions ·
  Historical outcomes · Recommended awareness points
- One pattern per report — do not combine multiple patterns
- Source data: `Pattern` MongoDB document

**Decision Log Export** (XLSX)
- One row per `decisionPoint` across all `MemoryEntry` records
- Columns: Date · Type · Amount · Currency · Counterparty · Outcome · Stress Score
- Apply Excel financial color coding (blue = hardcoded inputs, black = formulas)
- Add a summary pivot-style tab with totals by decision type

**Check-in Export** (XLSX or PDF)
- User's complete journal export — GDPR/data portability use case
- XLSX: one row per entry, columns for all structured fields, transcript in last column
- PDF: chronological narrative, grouped by month, summary stats at top

---

### 3B. Legal Documents (DOCX or PDF)

Read `references/legal-templates.md` for full clause libraries.

**Universal legal document rules:**
- Always add a disclaimer: *"This document is generated for informational purposes.
  It does not constitute legal advice. Consult a qualified attorney before signing."*
- Place disclaimer in the footer on every page (small, 9pt, gray)
- Use numbered sections (1., 1.1, 1.2...) not headings alone
- Defined terms in **bold** on first use, plain text thereafter
- Governing law clause always last substantive section
- Signature block: party name, title, date line, signature line — never pre-fill names
- Page numbers in footer: "Page X of Y"
- Never fabricate specific legal citations (case names, statute numbers) — use
  placeholders like `[APPLICABLE LAW]` if jurisdiction is unknown

**Common document types and required sections:**

| Document | Required Sections |
|---|---|
| NDA | Parties · Definition of Confidential Information · Obligations · Exclusions · Term · Remedies · Governing Law |
| Service Agreement | Parties · Scope of Services · Compensation · IP Ownership · Confidentiality · Termination · Liability Limitation · Governing Law |
| Loan Agreement | Parties · Principal Amount · Interest Rate · Repayment Schedule · Default · Security (if any) · Governing Law |
| Privacy Policy | Data collected · Purpose · Storage · Sharing · User rights · Contact · Effective date |
| Terms of Service | Acceptance · Eligibility · Permitted use · Prohibited use · IP · Disclaimers · Dispute resolution |
| Employment Agreement | Role · Compensation · Benefits · IP assignment · Non-compete · Termination · Governing Law |

---

### 3C. Financial Reports & Models (XLSX primary, DOCX/PDF for narrative)

Read `references/financial-models.md` for formula patterns and model structures.

**Universal financial document rules (from xlsx sub-skill — always apply):**
- Blue text = hardcoded inputs, Black = formulas, Green = cross-sheet links
- Currency always specified in column headers: `Revenue ($000s)` not just `Revenue`
- Zeros display as `–` via number format `$#,##0;($#,##0);–`
- Negative numbers in parentheses: `(1,234)` not `-1,234`
- Years as text strings in headers, not numbers
- Every assumption in a dedicated Assumptions tab or section — no hardcodes in formulas

**Common financial document types:**

| Document | Format | Key Tabs / Sections |
|---|---|---|
| Budget Forecast | XLSX | Assumptions · Monthly P&L · Annual Summary · Variance |
| Personal P&L | XLSX | Income · Expenses · Net · Trend chart |
| Investment Analysis | XLSX | DCF · Comparables · Sensitivity · Returns Summary |
| Net Worth Statement | XLSX | Assets · Liabilities · Net Worth · Change over time |
| Cash Flow Tracker | XLSX | Transactions · Monthly Summary · Category breakdown |
| Financial Summary Report | DOCX/PDF | Executive Summary · P&L · Balance Sheet · Narrative |
| Investor Pitch Deck | PPTX | Problem · Solution · Market · Business Model · Financials · Team · Ask |

---

### 3D. Compliance & Regulatory Documents

- GDPR data export: use Decision Log Export format (section 3A) as baseline
- Include data retention notice: *"Data retained per our Privacy Policy. Request
  deletion at [contact]."*
- AML/KYC documentation: out of scope — do not generate; recommend professional services
- Tax documents: generate templates only, never pre-fill tax amounts or rates

---

## 4. Generation checklist — run before finalising any document

```
□ Sub-skill loaded and its tooling rules applied?
□ Legal disclaimer in footer (legal docs only)?
□ Signature blocks are blank / placeholder only (legal docs)?
□ No fabricated legal citations, case names, or statute numbers?
□ Financial color coding applied (xlsx)?
□ All hardcoded values in blue (xlsx)?
□ Currency units in every column header (xlsx)?
□ KORA tone used for KORA-native documents?
□ Page numbers in footer (multi-page docs)?
□ File saved to /mnt/user-data/outputs/?
□ present_files called?
```

---

## 5. References

- `references/financial-life-review.md` — Full FLR structure, section scripts, tone guide
- `references/legal-templates.md` — Clause library for NDA, service agreement, loan, privacy policy
- `references/financial-models.md` — Excel formula patterns, DCF model, personal P&L layout
