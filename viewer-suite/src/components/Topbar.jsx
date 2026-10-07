import Icon from './Icon'
import ThemeToggle from './ThemeToggle'
import { FORMATS } from '../app/formats'
import { useActiveDoc } from '../app/workspace'

function Crumb({ route }) {
  const { active } = useActiveDoc(route)
  if (route === 'home') return <span className="crumb-current">Overview</span>
  return (
    <>
      <a href="#/" className="crumb-link">Workspace</a>
      <Icon name="chevronRight" size={14} className="crumb-sep" />
      <span className={active ? 'crumb-link-static' : 'crumb-current'}>{FORMATS[route].longLabel}</span>
      {active && (
        <>
          <Icon name="chevronRight" size={14} className="crumb-sep" />
          <span className="crumb-current truncate" title={active.name}>{active.name}</span>
        </>
      )}
    </>
  )
}

export default function Topbar({ route, theme, onThemeChange, onOpenPicker, onOpenPalette, onOpenMobileNav }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <header className="topbar">
      <button className="btn btn-quiet btn-icon topbar-menu" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Icon name="menu" />
      </button>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Crumb route={route} />
      </nav>
      <div className="spacer" />
      <button className="command-trigger" onClick={onOpenPalette} aria-label="Open command palette">
        <Icon name="search" size={15} />
        <span className="command-trigger-label">Search commands & files</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <ThemeToggle theme={theme} onChange={onThemeChange} />
      <button className="btn btn-primary topbar-open" onClick={() => onOpenPicker(route === 'home' ? undefined : route)}>
        <Icon name="upload" size={16} />
        <span className="topbar-open-label">Open file</span>
      </button>
    </header>
  )
}
