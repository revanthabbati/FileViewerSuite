import { useEffect } from 'react'

const TERMS = [
  { term: 'Segment', def: 'One line of an EDI file, e.g. "N1*ST*ACME WAREHOUSE~". Roughly equivalent to a row in a spreadsheet.' },
  { term: 'Element', def: 'One field within a segment, e.g. "ACME WAREHOUSE" in the segment above. Roughly equivalent to a cell in that row.' },
  { term: 'Qualifier', def: 'A short code (usually the first element in a segment) that tells you how to interpret the elements after it — e.g. "ST" in N1*ST*... means "the party named next is the Ship-To party".' },
  { term: 'Delimiter', def: 'The character used to separate things: element separator (between fields, often "*"), segment terminator (between lines, often "~"), component separator (between sub-parts of one field). Every real-world file can use different characters — they are declared in the ISA segment itself.' },
  { term: 'Envelope', def: 'The wrapper segments (ISA/IEA, GS/GE, ST/SE) that mark the start/end of an interchange, functional group, and transaction set. They carry control numbers used to verify nothing was lost or corrupted in transmission.' },
  { term: 'Functional Group', def: "A batch of one or more transaction sets of the same type, e.g. all the invoices in one file. Wrapped in GS...GE." },
  { term: 'Transaction Set', def: 'One complete business document — one purchase order, one invoice, one load tender. Wrapped in ST...SE. This is usually "the thing" a client is sending you.' },
  { term: 'Control Number', def: "A number the sender assigns and the trailer segment repeats back, so the receiver can confirm the header and trailer belong together and nothing was cut off in the middle." },
]

export default function GlossaryModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>EDI, in plain English</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <section>
            <h3>How a file is structured</h3>
            <p className="muted">Every X12 file nests the same way, like folders inside folders:</p>
            <div className="hierarchy-diagram">
              <div className="hierarchy-box hierarchy-isa">
                Interchange <span className="hierarchy-tag">ISA … IEA</span>
                <div className="hierarchy-box hierarchy-gs">
                  Functional Group <span className="hierarchy-tag">GS … GE</span>
                  <div className="hierarchy-box hierarchy-st">
                    Transaction Set <span className="hierarchy-tag">ST … SE</span>
                    <div className="hierarchy-box hierarchy-seg">
                      Segments <span className="hierarchy-tag">e.g. BEG, N1, PO1…</span>
                      <div className="hierarchy-box hierarchy-el">
                        Elements <span className="hierarchy-tag">the actual values</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="muted small">
              One file (interchange) can contain several functional groups; each group can contain several
              transaction sets (documents); each document is made of segments; each segment is made of elements.
            </p>
          </section>

          <section>
            <h3>Glossary</h3>
            <dl className="glossary-list">
              {TERMS.map((t) => (
                <div className="glossary-item" key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.def}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>Reading a segment</h3>
            <p className="muted">Take this real segment from a purchase order:</p>
            <pre className="raw-segment">N1*ST*ACME WAREHOUSE*92*12345~</pre>
            <ul className="reading-steps">
              <li><code>N1</code> — segment ID: "this is a party identification segment"</li>
              <li><code>ST</code> — first element, a qualifier: "the party below is the Ship-To party"</li>
              <li><code>ACME WAREHOUSE</code> — the party's name</li>
              <li><code>92</code> — a code telling you how to interpret the next element</li>
              <li><code>12345</code> — the party's ID code, per the qualifier above</li>
            </ul>
            <p className="muted small">
              This is exactly what the Plain-English Breakdown tab does automatically for every segment in your file.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
