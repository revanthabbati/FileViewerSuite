export default function ErrorBanner({ message, warnings }) {
  if (!message && (!warnings || warnings.length === 0)) return null
  return (
    <div className="banner-stack">
      {message && (
        <div className="banner banner-error">
          <strong>Could not parse this file.</strong>
          <p>{message}</p>
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="banner banner-warn">
          <strong>{warnings.length} structural warning{warnings.length > 1 ? 's' : ''}</strong>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
