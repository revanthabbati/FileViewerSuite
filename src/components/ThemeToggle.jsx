const OPTIONS = [
  { key: 'light', icon: '☀', label: 'Light theme' },
  { key: 'dark', icon: '☾', label: 'Dark theme' },
  { key: 'system', icon: '◐', label: 'Match system theme' },
]

export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          className={`theme-toggle-btn ${theme === opt.key ? 'theme-toggle-btn-active' : ''}`}
          title={opt.label}
          aria-label={opt.label}
          onClick={() => onChange(opt.key)}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
