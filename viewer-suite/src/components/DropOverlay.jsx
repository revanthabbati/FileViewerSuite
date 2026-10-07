import Icon from './Icon'
import { FORMAT_LIST } from '../app/formats'

// Purely visual (pointer-events: none) so drop zones underneath still receive their own drops.
export default function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true">
      <div className="drop-overlay-card">
        <div className="drop-overlay-icon">
          <Icon name="upload" size={30} />
        </div>
        <h2>Drop to open</h2>
        <p>The format is detected automatically from the file contents.</p>
        <div className="drop-overlay-kinds">
          {FORMAT_LIST.map((f) => (
            <span key={f.key} className={`kind-tag kind-tag-${f.key}`}>{f.key}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
