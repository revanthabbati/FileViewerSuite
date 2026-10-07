import { escapeHtml } from '../../app/utils.js'

export function mailboxLabel(m) {
  if (!m) return ''
  if (m.group) return `${m.name || 'Group'}: ${m.group.map(mailboxLabel).join(', ')}`
  return m.name ? `${m.name} <${m.address}>` : m.address || ''
}

export function flattenAddresses(list) {
  if (!list) return []
  const arr = Array.isArray(list) ? list : [list]
  return arr.flatMap((a) => (a.group ? a.group : [a])).filter((a) => a && (a.address || a.name))
}

export function initials(m) {
  const source = (m?.name || m?.address || '?').replace(/["']/g, '').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
}

export function colorFor(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 55% 48%)`
}

/** Parses Authentication-Results into [{ method: 'spf', result: 'pass', detail }]. */
export function parseAuthResults(headers) {
  const results = new Map()
  for (const h of headers) {
    if (h.key !== 'authentication-results' && h.key !== 'arc-authentication-results') continue
    const re = /\b(spf|dkim|dmarc|arc|bimi|compauth)\s*=\s*([a-z]+)([^;]*)/gi
    let m
    while ((m = re.exec(h.value))) {
      const method = m[1].toLowerCase()
      if (!results.has(method)) results.set(method, { method, result: m[2].toLowerCase(), detail: m[3].trim() })
    }
  }
  const order = ['spf', 'dkim', 'dmarc', 'arc', 'compauth', 'bimi']
  return [...results.values()].sort((a, b) => order.indexOf(a.method) - order.indexOf(b.method))
}

export function authTone(result) {
  if (result === 'pass') return 'ok'
  if (['fail', 'permerror', 'hardfail'].includes(result)) return 'error'
  if (['softfail', 'temperror', 'neutral', 'none', 'policy'].includes(result)) return 'warn'
  return ''
}

/** Turns the Received: chain into ordered hops (origin first) with per-hop delay. */
export function parseReceived(headers) {
  const hops = headers
    .filter((h) => h.key === 'received')
    .map((h) => {
      const v = h.value.replace(/\s+/g, ' ')
      const [main, datePart] = v.split(/;(?=[^;]*$)/)
      const from = /\bfrom\s+(\S+)(?:\s+\(([^)]*)\))?/i.exec(main)
      const by = /\bby\s+(\S+)/i.exec(main)
      const withProto = /\bwith\s+(\S+)/i.exec(main)
      const date = datePart ? new Date(datePart.trim()) : null
      return {
        from: from?.[1] || '—',
        fromDetail: from?.[2] || '',
        by: by?.[1] || '—',
        protocol: withProto?.[1] || '',
        date: date && !Number.isNaN(date.getTime()) ? date : null,
        raw: h.value,
      }
    })
    .reverse()
  return hops.map((hop, i) => {
    const prev = hops[i - 1]
    const delay = prev?.date && hop.date ? Math.max(0, (hop.date - prev.date) / 1000) : null
    return { ...hop, delay }
  })
}

export function formatDelay(sec) {
  if (sec === null || sec === undefined) return '—'
  if (sec < 1) return '< 1s'
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  return `${(sec / 3600).toFixed(1)}h`
}

export function toUint8(content) {
  if (content instanceof Uint8Array) return content
  if (content instanceof ArrayBuffer) return new Uint8Array(content)
  if (typeof content === 'string') return new TextEncoder().encode(content)
  return new Uint8Array(0)
}

export function attachmentBlob(att) {
  return new Blob([toUint8(att.content)], { type: att.mimeType || 'application/octet-stream' })
}

function bytesToBase64(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  return btoa(bin)
}

const REMOTE_RE = /(\b(?:src|background|poster)\s*=\s*["']?\s*(?:https?:)?\/\/)|(url\(\s*["']?\s*(?:https?:)?\/\/)|(<link\b[^>]*\bhref\s*=\s*["']?\s*(?:https?:)?\/\/)/i

export function hasRemoteContent(html) {
  return REMOTE_RE.test(html || '')
}

/**
 * Builds the srcdoc for the message iframe. The iframe is sandboxed without
 * allow-scripts/allow-same-origin; on top of that a CSP meta tag blocks every
 * network fetch unless the user opted in to remote content, and inline cid:
 * images are rewritten to data: URIs so they render without network access.
 */
export function buildSrcdoc(html, attachments, { allowRemote }) {
  const cidMap = new Map()
  for (const att of attachments) {
    if (!att.contentId) continue
    const cid = att.contentId.replace(/^<|>$/g, '')
    cidMap.set(cid.toLowerCase(), `data:${att.mimeType};base64,${bytesToBase64(toUint8(att.content))}`)
  }
  const body = html.replace(/cid:([^"'\s)>]+)/gi, (match, cid) => {
    let key = cid
    try {
      key = decodeURIComponent(cid)
    } catch {
      // malformed escape — fall back to the literal id
    }
    return cidMap.get(key.toLowerCase()) || match
  })

  const csp = allowRemote
    ? "default-src 'none'; img-src * data: blob:; media-src * data:; style-src 'unsafe-inline' *; font-src * data:"
    : "default-src 'none'; img-src data: blob:; media-src data:; style-src 'unsafe-inline'; font-src data:"

  const head = `<meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><base target="_blank"><style>html,body{margin:0}body{padding:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style>`
  if (/<head[^>]*>/i.test(body)) return body.replace(/<head[^>]*>/i, (m) => m + head)
  if (/<html[^>]*>/i.test(body)) return body.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`)
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`
}

export function textToSrcdoc(text) {
  const linked = escapeHtml(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" rel="noopener noreferrer">$1</a>')
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><base target="_blank"></head><body style="margin:0;padding:16px;font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;white-space:pre-wrap;color:#1f2937">${linked}</body></html>`
}

export function attachmentIcon(mime = '') {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'message/rfc822') return 'mail'
  if (mime.includes('edi') || mime.includes('x12')) return 'edi'
  if (mime.includes('parquet') || mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return 'table'
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) return 'code'
  return 'file'
}

const PREVIEWABLE = /^(image\/(png|jpe?g|gif|webp|bmp|svg\+xml|avif)|application\/pdf|text\/plain|text\/csv)$/i
export function isPreviewable(mime = '') {
  return PREVIEWABLE.test(mime)
}
