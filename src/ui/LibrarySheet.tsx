import { useEditorStore } from '../state/useEditorStore'
import type { LibraryTab } from '../types/ui'
import { BottomSheet } from './BottomSheet'
import { EnvironmentTab } from './EnvironmentTab'
import { ObjectsTab } from './ObjectsTab'
import { TerrainTab } from './TerrainTab'

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'environment', label: 'Environment' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'objects', label: 'Objects' },
]

/** The Library bottom sheet: Terrain / Objects tabs. */
export function LibrarySheet() {
  const open = useEditorStore((s) => s.panel === 'library')
  const closePanel = useEditorStore((s) => s.closePanel)
  const libraryTab = useEditorStore((s) => s.libraryTab)
  const setLibraryTab = useEditorStore((s) => s.setLibraryTab)

  const tabSwitcher = (
    <div className="tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={libraryTab === tab.id}
          className={`tabs__tab ${libraryTab === tab.id ? 'is-active' : ''}`}
          onClick={() => setLibraryTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  return (
    <BottomSheet open={open} title="Library" onClose={closePanel} headerRight={tabSwitcher}>
      {libraryTab === 'environment' && <EnvironmentTab />}
      {libraryTab === 'terrain' && <TerrainTab />}
      {libraryTab === 'objects' && <ObjectsTab />}
    </BottomSheet>
  )
}
