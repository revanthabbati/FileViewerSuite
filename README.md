# EDI Viewer

A browser-based tool that takes a raw EDI file (ANSI X12, with basic EDIFACT support) and produces:

- **A plain-English breakdown** — every segment and element, described in normal words instead of codes, so someone with zero EDI background can read a client's file and understand what it says. Includes a live search filter and Expand All / Collapse All controls.
- **A segment table** — every segment in the file in one flat, searchable table.
- **A suggested API mapping** — key business fields (PO number, ship/delivery dates, ship-to/ship-from, carrier, totals, etc.) pulled out into a flat JSON object, with a pointer back to the exact segment each field came from, as a starting point for mapping the file into an internal API payload.
- **API documentation import** — upload your own API docs (PDF or Word) or paste a field list / JSON example, and the tool fuzzy-matches field names from your docs against the fields found in the EDI file, with a confidence score per match.
- **Structural validation** — checks that control numbers (ISA/IEA, GS/GE, ST/SE) and segment/group counts are internally consistent, and flags it clearly when a file looks truncated or hand-edited.
- **A raw view** — the file split cleanly into segments, with the detected delimiters shown.
- **A built-in "What is EDI?" glossary** — a short explainer of the envelope structure and common terms, for anyone opening an EDI file for the first time.
- Light / dark / system theme toggle.

Everything runs client-side in the browser, including the PDF/Word parsing (via pdf.js and mammoth.js). No file content is ever uploaded to a server.

## Why this exists

Clients send EDI files (purchase orders, load tenders, invoices, shipment status updates, ASNs, functional acknowledgments, etc.) that need to be understood and mapped into internal systems. EDI's segment/element/qualifier structure is dense and unfamiliar to anyone who hasn't worked with it before. This tool exists to make a raw `ISA*00*...` string readable at a glance.

## Running locally

```bash
npm install
npm run dev
```

## Building for production

```bash
npm run build
```

Output goes to `dist/`.

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the app and deploys it to GitHub Pages automatically on every push to `main`.

One-time setup after pushing this repo to GitHub:

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The site will be published at:

   `https://<your-github-username>.github.io/EDIViewer/`

If you rename the repository to something other than `EDIViewer`, update the `base` path in `vite.config.js` to match (`base: '/<new-repo-name>/'`), otherwise assets will 404 on Pages.

## What's covered

- **X12**: full envelope parsing (ISA/GS/ST/SE/GE/IEA) with automatic delimiter detection (element, sub-element/component, and segment terminator — no assumptions about `*` or `~`, they're read from the ISA segment itself).
- **Segment dictionary**: ~50 of the most common segments across purchase orders (850), invoices (810), advance ship notices (856), motor carrier load tenders (204), load tender responses (990), shipment status (214), and functional acknowledgments (997) — the transaction sets most common in transportation/logistics EDI.
- **Qualifier code tables**: common qualifier codes (entity roles, reference number types, date/time qualifiers, units of measure, transport modes, payment terms) are resolved to plain English, not just left as raw 2-3 letter codes.
- **EDIFACT**: basic envelope parsing (UNB/UNH/UNT/UNZ, with UNA service-string-advice support) so non-X12 files don't just fail outright, though the segment dictionary above is X12-specific.
- Any segment not in the dictionary still displays — just with generic element numbering instead of friendly names — so the tool never blocks you from seeing the raw data.

## Extending the dictionary

Segment and element definitions live in `src/lib/segmentDictionary.js`. Qualifier code tables live in `src/lib/qualifiers.js`. Transaction set names live in `src/lib/transactionSets.js`. The heuristics that populate the "Suggested API Mapping" tab live in `extractBusinessSummary()` in `src/lib/ediParser.js` — add a case there for any new field you want auto-extracted.

## How the API-doc matching works

`src/lib/docExtractor.js` pulls text out of an uploaded PDF/DOCX (or pasted text) and heuristically extracts things that look like field names (JSON keys, table columns, "name - description" lines, snake_case/camelCase tokens). `src/lib/fieldMatcher.js` then scores each EDI field against each extracted candidate using token overlap plus an abbreviation-expansion table (`po` → purchase/order, `scac` → carrier/code/alpha, etc.). It's a heuristic, not a certainty — the UI always presents it as a suggestion with a confidence percentage, not a final mapping.

## Project structure

```
src/
  lib/
    ediParser.js          # delimiter detection + X12/EDIFACT parsing + hierarchy building
    describeSegment.js     # attaches human-readable names/values to a parsed segment
    segmentDictionary.js   # segment + element definitions
    qualifiers.js           # qualifier code lookup tables
    transactionSets.js      # transaction set (document type) names
    samples.js               # sample EDI files used by the "Try a sample" buttons
    flatten.js                # hierarchy -> flat list helper
  components/               # UI (input panel, breakdown tree, table, mapping, raw view)
  App.jsx
```
