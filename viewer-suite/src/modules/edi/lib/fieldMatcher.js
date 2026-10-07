// Fuzzy-matches field names pulled out of an uploaded API document against the
// business fields extracted from the parsed EDI file. This is intentionally a
// heuristic (token-overlap + abbreviation expansion), not a guarantee - the UI
// always labels its output as a "suggestion" to verify, not an authoritative map.

// Common logistics/EDI abbreviations expanded into the words they stand for,
// so "poNum" and "Purchase Order Number" score as a strong match.
const ABBREVIATIONS = {
  po: ['purchase', 'order'],
  bol: ['bill', 'of', 'lading'],
  bl: ['bill', 'lading'],
  scac: ['carrier', 'code', 'alpha'],
  eta: ['estimated', 'arrival', 'delivery'],
  etd: ['estimated', 'departure'],
  qty: ['quantity'],
  amt: ['amount'],
  addr: ['address'],
  num: ['number'],
  no: ['number'],
  id: ['identifier', 'id'],
  desc: ['description'],
  ref: ['reference'],
  inv: ['invoice'],
  asn: ['advance', 'ship', 'notice', 'shipment'],
  dt: ['date'],
  qual: ['qualifier'],
  wt: ['weight'],
  pkg: ['package', 'packaging'],
  ship: ['shipment', 'shipping'],
  cust: ['customer'],
  loc: ['location'],
  cd: ['code'],
}

// Deliberately NOT stripping words like "number", "date", "type", or "value" -
// those are exactly what distinguish "orderNumber" from "orderDate" from
// "orderType". Stripping them collapses distinct fields into the same token
// set and produces false-positive matches (see fieldSimilarity guard below).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'is', 'are', 'this', 'that',
  'field', 'string', 'boolean', 'object', 'array', 'null', 'true', 'false',
  'optional', 'required', 'example', 'default',
])

export function tokenize(raw) {
  if (!raw) return []
  const spaced = String(raw)
    // split camelCase / PascalCase boundaries
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // split acronym followed by capitalized word, e.g. "SCACCode" -> "SCAC Code"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // any non-alphanumeric becomes a space
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim()

  if (!spaced) return []

  const tokens = spaced.split(/\s+/).filter(Boolean)
  const expanded = []
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue
    expanded.push(t)
    if (ABBREVIATIONS[t]) expanded.push(...ABBREVIATIONS[t])
  }
  return expanded
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function containment(aTokens, bTokens) {
  const joinedA = aTokens.join('')
  const joinedB = bTokens.join('')
  if (!joinedA || !joinedB) return 0
  if (joinedA === joinedB) return 1
  const shorter = Math.min(joinedA.length, joinedB.length)
  const longer = Math.max(joinedA.length, joinedB.length)
  // A short joined string (e.g. after abbreviation expansion collapses to just
  // 1-2 tokens) is a substring of almost everything - only trust containment
  // once there's enough length to be a meaningfully specific match.
  if (shorter < 8) return 0
  if (joinedA.includes(joinedB) || joinedB.includes(joinedA)) {
    return 0.6 + 0.4 * (shorter / longer)
  }
  return 0
}

export function fieldSimilarity(aRaw, bRaw) {
  const aTokens = tokenize(aRaw)
  const bTokens = tokenize(bRaw)
  return Math.max(jaccard(aTokens, bTokens), containment(aTokens, bTokens))
}

const MIN_SCORE = 0.28

// ediFields: [{ key, label, value, priority, transactionType }]
// apiFields: [{ name, contexts: [string], count }]
// returns: [{ ediField, matches: [{ apiField, score }] (best-first, up to 3) }]
export function matchFields(ediFields, apiFields) {
  const results = []
  for (const ediField of ediFields) {
    const searchText = `${ediField.label} ${ediField.key}`
    const scored = apiFields
      .map((apiField) => ({ apiField, score: fieldSimilarity(searchText, apiField.name) }))
      .filter((m) => m.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    if (scored.length > 0) {
      results.push({ ediField, matches: scored })
    }
  }
  results.sort((a, b) => {
    if (a.ediField.priority !== b.ediField.priority) return a.ediField.priority ? -1 : 1
    return b.matches[0].score - a.matches[0].score
  })
  return results
}
