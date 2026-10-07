export default function RawView({ parsed }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Raw EDI (Segmented)</h2>
        <p className="muted">
          The original content, split into segments using the detected delimiters. Element separator{' '}
          <code>{JSON.stringify(parsed.delimiters.elementSep)}</code>
          {parsed.delimiters.componentSep && (
            <>
              , component separator <code>{JSON.stringify(parsed.delimiters.componentSep)}</code>
            </>
          )}
          , segment terminator <code>{JSON.stringify(parsed.delimiters.terminator)}</code>.
        </p>
      </div>
      <div className="table-scroll">
        <table className="raw-table">
          <tbody>
            {parsed.allSegments.map((seg) => (
              <tr key={seg.index}>
                <td className="raw-line-number">{seg.index + 1}</td>
                <td className="raw-line-content">{seg.raw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
