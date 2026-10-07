import { SAMPLES as EDI_SAMPLES } from '../modules/edi/lib/samples'
import { SAMPLE_EML } from '../modules/eml/sampleEml'

/*
 * Sample documents for each viewer, so a first-time user can see every module
 * working without hunting for a real file. Each loader resolves to a Blob.
 */
export const SAMPLE_FILES = [
  {
    key: 'eml-sample',
    kind: 'eml',
    name: 'Q3-shipment-update.eml',
    label: 'Shipment update email',
    load: async () => new Blob([SAMPLE_EML], { type: 'message/rfc822' }),
  },
  ...EDI_SAMPLES.map((s) => ({
    key: `edi-${s.key}`,
    kind: 'edi',
    name: `sample-${s.key}.edi`,
    label: s.label,
    load: async () => new Blob([s.content], { type: 'text/plain' }),
  })),
  {
    key: 'parquet-sample',
    kind: 'parquet',
    name: 'deliveries-sample.parquet',
    label: 'Deliveries dataset (5,000 rows)',
    load: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/deliveries-sample.parquet`)
      if (!res.ok) throw new Error(`Could not load the sample Parquet file (HTTP ${res.status}).`)
      return res.blob()
    },
  },
]

export function samplesFor(kind) {
  return SAMPLE_FILES.filter((s) => s.kind === kind)
}

export async function openSample(sample, addDoc, notify) {
  try {
    const blob = await sample.load()
    addDoc(blob, { name: sample.name, kind: sample.kind, origin: 'sample' })
  } catch (e) {
    notify?.(e.message, 'error')
  }
}
