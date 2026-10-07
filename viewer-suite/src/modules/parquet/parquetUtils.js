import { cachedAsyncBuffer, parquetMetadataAsync, parquetReadObjects, parquetSchema } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'

/*
 * Thin layer over hyparquet. Files are read through an AsyncBuffer backed by
 * Blob.slice(), so only the footer and the byte ranges of the rows/columns being
 * displayed are ever pulled into memory — multi-GB files open instantly.
 */

export function blobAsyncBuffer(blob) {
  return cachedAsyncBuffer({
    byteLength: blob.size,
    slice: (start, end) => blob.slice(start, end).arrayBuffer(),
  })
}

const CONVERTED_LABELS = {
  UTF8: 'STRING',
  TIMESTAMP_MILLIS: 'TIMESTAMP(ms)',
  TIMESTAMP_MICROS: 'TIMESTAMP(µs)',
  TIME_MILLIS: 'TIME(ms)',
  TIME_MICROS: 'TIME(µs)',
}

function logicalTypeLabel(el) {
  const lt = el.logical_type
  if (lt?.type) {
    switch (lt.type) {
      case 'DECIMAL':
        return `DECIMAL(${lt.precision ?? el.precision},${lt.scale ?? el.scale ?? 0})`
      case 'TIMESTAMP':
        return `TIMESTAMP(${lt.unit || ''}${lt.isAdjustedToUTC ? ', UTC' : ''})`
      case 'TIME':
        return `TIME(${lt.unit || ''})`
      case 'INTEGER':
        return `${lt.isSigned === false ? 'UINT' : 'INT'}${lt.bitWidth || ''}`
      default:
        return lt.type
    }
  }
  if (el.converted_type) return CONVERTED_LABELS[el.converted_type] || el.converted_type
  return null
}

function nodeType(tree) {
  const el = tree.element
  if (!tree.children.length) return logicalTypeLabel(el) || el.type || 'UNKNOWN'
  const ct = el.converted_type || el.logical_type?.type
  if (ct === 'LIST') return 'LIST'
  if (ct === 'MAP' || ct === 'MAP_KEY_VALUE') return 'MAP'
  return 'STRUCT'
}

export function describeSchemaNode(tree) {
  const el = tree.element
  return {
    name: el.name,
    path: tree.path.join('.'),
    type: nodeType(tree),
    physicalType: el.type || null,
    logicalType: logicalTypeLabel(el),
    repetition: el.repetition_type || 'REQUIRED',
    nullable: el.repetition_type !== 'REQUIRED',
    fieldId: el.field_id,
    children: tree.children.map(describeSchemaNode),
  }
}

export async function openParquet(blob) {
  const file = blobAsyncBuffer(blob)
  const metadata = await parquetMetadataAsync(file)
  const tree = parquetSchema(metadata)
  const schema = describeSchemaNode(tree)
  return {
    file,
    metadata,
    schema,
    columns: schema.children,
    numRows: Number(metadata.num_rows),
  }
}

export function readRows(pq, { rowStart, rowEnd, columns }) {
  return parquetReadObjects({
    file: pq.file,
    metadata: pq.metadata,
    rowStart,
    rowEnd,
    columns,
    compressors,
  })
}

/** Aggregates column-chunk metadata across row groups into one entry per leaf column. */
export function columnChunkStats(metadata) {
  const byPath = new Map()
  for (const rg of metadata.row_groups) {
    for (const chunk of rg.columns) {
      const md = chunk.meta_data
      if (!md) continue
      const path = md.path_in_schema.join('.')
      let s = byPath.get(path)
      if (!s) {
        s = {
          path,
          type: md.type,
          codecs: new Set(),
          encodings: new Set(),
          compressed: 0,
          uncompressed: 0,
          values: 0,
          nulls: 0,
          nullsKnown: true,
          min: undefined,
          max: undefined,
          distinct: null,
        }
        byPath.set(path, s)
      }
      s.codecs.add(md.codec)
      md.encodings?.forEach((e) => s.encodings.add(e))
      s.compressed += Number(md.total_compressed_size)
      s.uncompressed += Number(md.total_uncompressed_size)
      s.values += Number(md.num_values)
      const st = md.statistics
      if (st?.null_count !== undefined) s.nulls += Number(st.null_count)
      else s.nullsKnown = false
      const min = st?.min_value ?? st?.min
      const max = st?.max_value ?? st?.max
      if (min !== undefined && min !== null && (s.min === undefined || compareValues(min, s.min) < 0)) s.min = min
      if (max !== undefined && max !== null && (s.max === undefined || compareValues(max, s.max) > 0)) s.max = max
      if (st?.distinct_count !== undefined) s.distinct = (s.distinct ?? 0) + Number(st.distinct_count)
    }
  }
  return [...byPath.values()].map((s) => ({ ...s, codecs: [...s.codecs], encodings: [...s.encodings] }))
}

/* ---------- Value formatting ---------- */

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Uint8Array) return bytesPreview(value)
  return value
}

function bytesPreview(bytes) {
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  return `0x${hex}${bytes.length > 16 ? '…' : ''} (${bytes.length} B)`
}

export function cellKind(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'bigint') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (value instanceof Uint8Array) return 'binary'
  if (typeof value === 'object') return 'object'
  return 'string'
}

export function formatValue(value) {
  switch (cellKind(value)) {
    case 'null':
      return 'null'
    case 'number':
      return value.toString()
    case 'boolean':
      return value ? 'true' : 'false'
    case 'date':
      return Number.isNaN(value.getTime()) ? 'Invalid date' : value.toISOString()
    case 'binary':
      return bytesPreview(value)
    case 'object':
      return JSON.stringify(value, jsonReplacer)
    default:
      return String(value)
  }
}

export function prettyValue(value) {
  if (cellKind(value) === 'object') return JSON.stringify(value, jsonReplacer, 2)
  return formatValue(value)
}

export function compareValues(a, b) {
  const ka = cellKind(a)
  const kb = cellKind(b)
  if (ka === 'null' || kb === 'null') return ka === kb ? 0 : ka === 'null' ? 1 : -1
  if (ka === 'number' && kb === 'number') {
    if (typeof a === 'bigint' || typeof b === 'bigint') {
      const ba = BigInt(typeof a === 'number' ? Math.trunc(a) : a)
      const bb = BigInt(typeof b === 'number' ? Math.trunc(b) : b)
      return ba < bb ? -1 : ba > bb ? 1 : 0
    }
    return a - b
  }
  if (ka === 'date' && kb === 'date') return a.getTime() - b.getTime()
  if (ka === 'boolean' && kb === 'boolean') return a === b ? 0 : a ? 1 : -1
  return formatValue(a).localeCompare(formatValue(b), undefined, { numeric: true, sensitivity: 'base' })
}

/* ---------- Filtering ---------- */

export const OPERATORS = [
  { key: 'contains', label: 'contains', needsValue: true },
  { key: 'eq', label: '=', needsValue: true },
  { key: 'ne', label: '≠', needsValue: true },
  { key: 'gt', label: '>', needsValue: true },
  { key: 'gte', label: '≥', needsValue: true },
  { key: 'lt', label: '<', needsValue: true },
  { key: 'lte', label: '≤', needsValue: true },
  { key: 'starts', label: 'starts with', needsValue: true },
  { key: 'null', label: 'is null', needsValue: false },
  { key: 'notnull', label: 'is not null', needsValue: false },
]

function coerceLike(sample, raw) {
  const kind = cellKind(sample)
  if (kind === 'number') {
    const n = Number(raw)
    if (raw.trim() === '' || Number.isNaN(n)) return raw
    if (typeof sample === 'bigint' && /^-?\d+$/.test(raw.trim())) return BigInt(raw.trim())
    return n
  }
  if (kind === 'date') {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? raw : d
  }
  if (kind === 'boolean') return /^(true|1|yes)$/i.test(raw.trim())
  return raw
}

export function matchesCondition(value, { op, value: raw = '' }) {
  if (op === 'null') return value === null || value === undefined
  if (op === 'notnull') return value !== null && value !== undefined
  if (value === null || value === undefined) return false
  if (op === 'contains') return formatValue(value).toLowerCase().includes(raw.toLowerCase())
  if (op === 'starts') return formatValue(value).toLowerCase().startsWith(raw.toLowerCase())
  const target = coerceLike(value, raw)
  const cmp = typeof target === 'string' && cellKind(value) !== 'string'
    ? formatValue(value).localeCompare(target, undefined, { numeric: true, sensitivity: 'base' })
    : compareValues(value, target)
  switch (op) {
    case 'eq':
      return cmp === 0
    case 'ne':
      return cmp !== 0
    case 'gt':
      return cmp > 0
    case 'gte':
      return cmp >= 0
    case 'lt':
      return cmp < 0
    case 'lte':
      return cmp <= 0
    default:
      return true
  }
}

/* ---------- Export ---------- */

function csvEscape(s) {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function rowsToCsv(rows, columns) {
  const lines = [columns.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => (row[c] === null || row[c] === undefined ? '' : csvEscape(formatValue(row[c])))).join(','))
  }
  return lines.join('\r\n')
}

export function rowsToJson(rows, columns) {
  const projected = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])))
  return JSON.stringify(projected, (k, v) => (v instanceof Date ? v.toISOString() : jsonReplacer(k, v)), 2)
}
