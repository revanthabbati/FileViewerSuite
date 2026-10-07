import Icon from './Icon'
import { useWorkspace } from '../app/workspace'

const ICONS = { info: 'info', error: 'alert', success: 'check' }

export default function Toasts() {
  const { toasts, dismissToast } = useWorkspace()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <Icon name={ICONS[t.tone] || 'info'} size={16} />
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
