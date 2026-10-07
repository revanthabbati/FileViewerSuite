# FileViewerSuite: EML, EDI & Parquet

Viewer Suite is one browser-only workspace for the file types our integrations produce: customer **emails (.eml)**, **EDI documents (ANSI X12 / EDIFACT)** and **Apache Parquet datasets**. It replaces the separate *EML Viewer* and *EDI Viewer* apps with a single product that shares one UI.

> **Zero-upload architecture.** All parsing happens inside the browser tab. Files are held in memory only. They are never sent to a server, logged or persisted.

## Highlights

| | |
|---|---|
| **Universal open** | You can drop a file anywhere, use the **Open file** button (`Ctrl/⌘ O`) or open the command palette (`Ctrl/⌘ K`). The format is detected from the file contents (Parquet magic bytes, ISA/UNA/UNB envelopes, RFC 822 headers), so extensions such as `.txt` and `.dat` still route to the right viewer. |
| **Multi-file workspace** | Several files can stay open at once. They appear in the sidebar and in per-viewer tabs, so you can switch between them without re-uploading. |
| **Cross-viewer flows** | An EDI, Parquet or nested EML attachment inside an email opens in its own viewer with one click. |
| **Enterprise UX** | Collapsible sidebar, breadcrumbs, command palette, toasts, light/dark/system themes, responsive layout down to phone width, and keyboard navigation. |

### EML viewer
- Envelope card with sender avatar, To/Cc/Bcc/Reply-To, and **SPF / DKIM / DMARC** results parsed from `Authentication-Results`.
- HTML body rendered in a **script-less sandboxed iframe** with a strict CSP. **Remote content is blocked by default**, which stops tracking pixels, and you can opt in per message. Inline `cid:` images are rewritten to data URIs so they render offline.
- HTML / plain-text toggle, searchable **headers table**, **delivery path** reconstructed from `Received:` hops with per-hop latency, and the raw MIME source.
- Attachments: thumbnails, preview (images, PDF, text), download, and **Open in viewer**.

### EDI viewer
This is the full feature set of the original EDI Viewer, unchanged:
- Plain-English breakdown of every segment and element, with search and expand/collapse.
- A segment table, raw view with the detected delimiters, and control-number / count validation.
- Suggested API mapping (exportable as JSON) plus **API-doc import** (PDF/DOCX/text) with fuzzy field matching.
- Paste raw EDI or try the bundled 850 / 204 / 214 / 810 / 997 samples.

### Parquet viewer
- Reads lazily through `Blob.slice()`. Only the footer and the pages you look at are decoded, so very large files open instantly.
- **Data grid**: paging (50 to 500 rows), go-to-page, column chooser (unselected columns are never decoded), sticky header and row numbers, and a type-aware cell renderer. Clicking a row opens a **drawer** with every column.
- **Query mode**: global search, a filter builder (`contains`, `=`, `≠`, `>`, `≥`, `<`, `≤`, `starts with`, `is null`) and column sorting across the whole file. Query mode is guarded by an in-memory cell budget.
- **Schema tree** with logical and physical types, **column statistics** from the footer (nulls, min/max, codec, encodings, size and compression ratio), and **file metadata** (row groups and key/value metadata such as Arrow/pandas schemas).
- Export the current page, all matching rows or the whole file to **CSV / JSON**.
- Supports Snappy, Gzip, Zstd, Brotli and LZ4 via `hyparquet-compressors`.

## Getting started

```bash
cd viewer-suite
npm install
npm run dev      # http://localhost:5173/FileViewerSuite/
npm run build    # production bundle in viewer-suite/dist
npm run lint
```

## Deployment

`.github/workflows/deploy.yml` builds this folder and publishes `viewer-suite/dist` to GitHub Pages on every push to `main`. The site is served under `/FileViewerSuite/`. If the repository is renamed, update `base` in `vite.config.js`.

## Architecture

```
viewer-suite/
  public/samples/            sample Parquet dataset (synthetic)
  src/
    App.jsx                  shell: layout, global drag & drop, shortcuts, lazy-loaded viewers
    app/
      workspace.jsx          in-memory document store (open/activate/close) + toasts
      formats.js             format registry + content sniffing
      router.js              hash router (works on static hosting)
      samples.js             sample loaders for every viewer
      theme.js, utils.js
    components/              Sidebar, Topbar, CommandPalette, Home, ViewerChrome, Icon, …
    styles/                  tokens.css (design tokens, light/dark), base.css, shell.css
    modules/
      eml/                   EmlViewer, emlUtils (sandbox/CSP, auth results, Received hops), sample
      edi/                   EdiViewer + the original EDI parser, dictionary and components
      parquet/               ParquetViewer, DataGrid, parquetUtils (hyparquet wrapper)
```

Each viewer is code-split. For example, the Parquet decoders and pdf.js are downloaded only when they are first needed.

### Key libraries
- [`postal-mime`](https://github.com/postalsys/postal-mime): MIME parsing (EML)
- [`hyparquet`](https://github.com/hyparam/hyparquet) + `hyparquet-compressors`: pure-JS Parquet reader
- `pdfjs-dist`, `mammoth`: API-documentation import in the EDI mapping tab
- React 19 + Vite

---
Engineered by Revanth Reddy Abbati.
