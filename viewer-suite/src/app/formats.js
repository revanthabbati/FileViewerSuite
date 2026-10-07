// Registry of supported formats plus content-based detection, so a file dropped
// anywhere in the app is routed to the right viewer regardless of its extension.

export const FORMATS = {
  eml: {
    key: 'eml',
    label: 'Email',
    longLabel: 'EML Email Viewer',
    icon: 'mail',
    extensions: ['eml', 'mht', 'mhtml'],
    accept: '.eml,.mht,.mhtml,message/rfc822',
    tagline: 'Read RFC 822 / MIME messages with headers, attachments and sender authentication.',
    features: ['Safe sandboxed HTML rendering', 'Remote content blocked by default', 'SPF / DKIM / DMARC results', 'Attachment preview & download'],
  },
  edi: {
    key: 'edi',
    label: 'EDI',
    longLabel: 'EDI Document Viewer',
    icon: 'edi',
    extensions: ['edi', 'x12', 'dat', 'txt', '850', '810', '856', '204', '210', '214', '990', '997', '855', '940', '945', 'edifact'],
    accept: '.edi,.x12,.txt,.dat,.edifact,.850,.810,.856,.855,.204,.210,.214,.940,.945,.990,.997',
    tagline: 'Break ANSI X12 & EDIFACT files into plain English and map them to your API.',
    features: ['Plain-English segment breakdown', 'Control-number validation', 'Suggested API field mapping', 'Match against your API docs'],
  },
  parquet: {
    key: 'parquet',
    label: 'Parquet',
    longLabel: 'Parquet Data Viewer',
    icon: 'table',
    extensions: ['parquet', 'pq', 'parq'],
    accept: '.parquet,.pq,.parq',
    tagline: 'Explore Apache Parquet datasets — schema, row groups, statistics and data.',
    features: ['Streams only the rows you view', 'Schema & logical types', 'Row-group & column-chunk stats', 'Export to CSV / JSON'],
  },
}

export const FORMAT_LIST = Object.values(FORMATS)

export const ACCEPT_ALL = FORMAT_LIST.map((f) => f.accept).join(',')

const EML_HEADER_RE =
  /^(received|from|to|subject|date|return-path|mime-version|message-id|delivered-to|x-[\w-]+|dkim-signature|arc-[\w-]+|authentication-results|content-type|reply-to|sender|thread-topic|thread-index)\s*:/im

function extensionOf(name = '') {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

/**
 * Sniffs the first/last bytes of a Blob and returns 'eml' | 'edi' | 'parquet' | null.
 * Content wins over extension: a Parquet file always starts and ends with "PAR1",
 * and X12/EDIFACT interchanges always open with an ISA/UNA/UNB envelope.
 */
export async function detectFormat(blob, name = blob.name) {
  const ext = extensionOf(name)
  const head = new Uint8Array(await blob.slice(0, 4096).arrayBuffer())

  if (head.length >= 4 && head[0] === 0x50 && head[1] === 0x41 && head[2] === 0x52 && head[3] === 0x31) {
    return 'parquet'
  }

  const text = new TextDecoder('latin1').decode(head).replace(/^﻿/, '')
  const trimmed = text.trimStart()
  if (/^(ISA.|UNA.|UNB\+)/.test(trimmed) || /^(GS|ST)\*/.test(trimmed)) return 'edi'

  if (FORMATS.parquet.extensions.includes(ext)) return 'parquet'
  if (FORMATS.eml.extensions.includes(ext)) return 'eml'

  // Plain .txt/.dat could be either; headers at the very top mean it is a message.
  const firstLines = trimmed.split(/\r?\n/).slice(0, 6).join('\n')
  if (EML_HEADER_RE.test(firstLines)) return 'eml'

  if (FORMATS.edi.extensions.includes(ext)) return 'edi'
  return null
}

export function formatForMime(mimeType = '') {
  const m = mimeType.toLowerCase()
  if (m === 'message/rfc822') return 'eml'
  if (m.includes('edi-x12') || m.includes('edifact')) return 'edi'
  if (m.includes('parquet')) return 'parquet'
  return null
}
