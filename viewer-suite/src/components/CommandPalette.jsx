import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { FORMAT_LIST } from '../app/formats'
import { navigate } from '../app/router'
import { useWorkspace } from '../app/workspace'
import { SAMPLE_FILES, openSample } from '../app/samples'

export default function CommandPalette({ onClose, onOpenPicker, onThemeChange }) {
  const { docs, activate, addDoc, notify, closeAll } = useWorkspace()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const commands = useMemo(() => {
    const list = [
      { id: 'open', group: 'Actions', icon: 'upload', label: 'Open file…', hint: 'Ctrl O', run: () => onOpenPicker() },
      ...FORMAT_LIST.map((f) => ({
        id: `open-${f.key}`,
        group: 'Actions',
        icon: f.icon,
        label: `Open ${f.label} file…`,
        run: () => onOpenPicker(f.key),
      })),
      { id: 'go-home', group: 'Navigate', icon: 'home', label: 'Go to Overview', run: () => navigate('home') },
      ...FORMAT_LIST.map((f) => ({
        id: `go-${f.key}`,
        group: 'Navigate',
        icon: f.icon,
        label: `Go to ${f.longLabel}`,
        run: () => navigate(f.key),
      })),
      ...docs.map((d) => ({
        id: `doc-${d.id}`,
        group: 'Open files',
        icon: FORMAT_LIST.find((f) => f.key === d.kind)?.icon || 'file',
        label: d.name,
        tag: d.kind,
        run: () => activate(d),
      })),
      ...SAMPLE_FILES.map((s) => ({
        id: s.key,
        group: 'Samples',
        icon: 'zap',
        label: `Load sample: ${s.label}`,
        tag: s.kind,
        run: () => openSample(s, addDoc, notify),
      })),
      { id: 'theme-light', group: 'Preferences', icon: 'sun', label: 'Theme: Light', run: () => onThemeChange('light') },
      { id: 'theme-dark', group: 'Preferences', icon: 'moon', label: 'Theme: Dark', run: () => onThemeChange('dark') },
      { id: 'theme-system', group: 'Preferences', icon: 'monitor', label: 'Theme: Match system', run: () => onThemeChange('system') },
    ]
    if (docs.length) {
      list.push({ id: 'close-all', group: 'Actions', icon: 'close', label: 'Close all files', run: () => closeAll() })
    }
    return list
  }, [docs, onOpenPicker, onThemeChange, activate, addDoc, notify, closeAll])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    const terms = q.split(/\s+/)
    return commands.filter((c) => {
      const hay = `${c.label} ${c.group} ${c.tag || ''}`.toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
  }, [commands, query])

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (cmd) => {
    onClose()
    cmd.run()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && filtered[index]) {
      e.preventDefault()
      run(filtered[index])
    }
  }

  let lastGroup = null
  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command, file name or sample…"
            aria-label="Search commands"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" ref={listRef} role="listbox">
          {filtered.length === 0 && <li className="palette-empty">No matching commands.</li>}
          {filtered.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? cmd.group : null
            lastGroup = cmd.group
            return (
              <li key={cmd.id} role="presentation">
                {header && <div className="palette-group">{header}</div>}
                <button
                  role="option"
                  aria-selected={i === index}
                  data-active={i === index}
                  className="palette-item"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(cmd)}
                >
                  <Icon name={cmd.icon} size={16} />
                  <span className="truncate">{cmd.label}</span>
                  <span className="spacer" />
                  {cmd.tag && <span className={`kind-tag kind-tag-${cmd.tag}`}>{cmd.tag}</span>}
                  {cmd.hint && <kbd>{cmd.hint}</kbd>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
