import Icon from './Icon'

const OPTIONS = [
  { key: 'light', icon: 'sun', label: 'Light theme' },
  { key: 'dark', icon: 'moon', label: 'Dark theme' },
  { key: 'system', icon: 'monitor', label: 'Match system theme' },
]

export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="segmented theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button key={opt.key} title={opt.label} aria-label={opt.label} aria-pressed={theme === opt.key} onClick={() => onChange(opt.key)}>
          <Icon name={opt.icon} size={15} />
        </button>
      ))}
    </div>
  )
}
