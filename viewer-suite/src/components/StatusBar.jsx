import Icon from './Icon'
import { useWorkspace } from '../app/workspace'
import { formatBytes } from '../app/utils'

export default function StatusBar() {
  const { docs } = useWorkspace()
  const total = docs.reduce((sum, d) => sum + d.size, 0)
  return (
    <footer className="statusbar">
      <span className="status-item status-secure">
        <Icon name="lock" size={13} />
        Processed locally — files never leave this device
      </span>
      <span className="status-item">
        {docs.length} open file{docs.length === 1 ? '' : 's'}
        {docs.length > 0 && ` · ${formatBytes(total)} in memory`}
      </span>
      <span className="spacer" />
      <span className="status-item status-credit">Engineered by Revanth Reddy Abbati</span>
    </footer>
  )
}
