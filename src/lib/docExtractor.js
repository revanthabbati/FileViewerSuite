// Extracts raw text from an uploaded PDF or Word document (entirely client-side -
// nothing is uploaded anywhere), then heuristically pulls out things that look
// like API field/parameter names so they can be matched against the EDI file.

async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text
}

async function extractTextFromDocx(arrayBuffer) {
  const mammoth = (await import('mammoth')).default
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function extractTextFromFile(file) {
  const name = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()
  if (name.endsWith('.pdf')) {
    return extractTextFromPdf(buffer)
  }
  if (name.endsWith('.docx')) {
    return extractTextFromDocx(buffer)
  }
  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported in-browser - please save the file as .docx or .pdf and try again.')
  }
  // fall back to treating it as plain text
  return buffer ? new TextDecoder().decode(buffer) : ''
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'is', 'are', 'this', 'that', 'with',
  'from', 'will', 'can', 'must', 'not', 'has', 'have', 'was', 'were', 'when', 'then', 'than',
  'string', 'number', 'boolean', 'object', 'array', 'null', 'true', 'false', 'integer', 'float',
  'optional', 'required', 'type', 'example', 'default', 'endpoint', 'response', 'request',
  'parameter', 'parameters', 'field', 'fields', 'value', 'values', 'note', 'notes', 'section',
])

const IDENTIFIER_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,45}$/
const LOOKS_LIKE_CODE_RE = /_|[a-z][A-Z]/ // has underscore or camelCase hump

function isLikelyFieldName(token) {
  const clean = token.replace(/[.,:;]+$/, '')
  if (!IDENTIFIER_RE.test(clean)) return false
  if (STOPWORDS.has(clean.toLowerCase())) return false
  if (/^\d+$/.test(clean)) return false
  return LOOKS_LIKE_CODE_RE.test(clean) || clean.length >= 4
}

// Pulls candidate field names out of raw text using several complementary
// heuristics, since API docs vary wildly in format (JSON samples, markdown/word
// tables, "name - description" bullet lists, OpenAPI-style parameter lists).
export function extractCandidateApiFields(text) {
  const candidates = new Map() // normalized -> { name, contexts: Set, count }

  const add = (name, context) => {
    const clean = name.replace(/[.,:;]+$/, '').trim()
    if (!clean) return
    const norm = clean.toLowerCase()
    if (!candidates.has(norm)) {
      candidates.set(norm, { name: clean, contexts: new Set(), count: 0 })
    }
    const entry = candidates.get(norm)
    entry.count += 1
    if (context && entry.contexts.size < 3) {
      entry.contexts.add(context.trim().slice(0, 140))
    }
  }

  // Pass 1: JSON-style keys - "fieldName": ... (works great on pasted schemas/samples)
  const jsonKeyRe = /"([a-zA-Z_][a-zA-Z0-9_]{1,45})"\s*:/g
  let m
  while ((m = jsonKeyRe.exec(text)) !== null) {
    const lineStart = text.lastIndexOf('\n', m.index) + 1
    const lineEnd = text.indexOf('\n', m.index)
    add(m[1], text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd))
  }

  // Pass 2: line-oriented formats - tables (tab / pipe separated), and
  // "fieldName - description" or "fieldName: description" bullet/definition lines.
  const lines = text.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.length > 300) continue

    let cell = null
    if (line.includes('|')) {
      cell = line.split('|').map((c) => c.trim()).filter(Boolean)[0]
    } else if (line.includes('\t')) {
      cell = line.split('\t').map((c) => c.trim()).filter(Boolean)[0]
    } else {
      const dashOrColon = line.match(/^([a-zA-Z][a-zA-Z0-9_]{2,45})\s*[-:–]\s+(.{3,140})/)
      if (dashOrColon) {
        cell = dashOrColon[1]
        add(cell, dashOrColon[2])
        continue
      }
    }
    if (cell && isLikelyFieldName(cell)) {
      add(cell, line)
    }
  }

  // Pass 3: standalone snake_case / camelCase tokens anywhere in the text
  // (catches inline mentions like "...returned in the shipToAddress field.")
  const tokenRe = /\b[a-zA-Z][a-zA-Z0-9_]{2,45}\b/g
  while ((m = tokenRe.exec(text)) !== null) {
    const token = m[0]
    if (LOOKS_LIKE_CODE_RE.test(token) && isLikelyFieldName(token)) {
      const start = Math.max(0, m.index - 60)
      const end = Math.min(text.length, m.index + 80)
      add(token, text.slice(start, end).replace(/\s+/g, ' '))
    }
  }

  return Array.from(candidates.values())
    .map((c) => ({ name: c.name, contexts: Array.from(c.contexts), count: c.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 400)
}
