import { Experience } from './app/Experience'
import { isCameraRemote } from './camera/cameraRemote'
import { useCloudAutosave } from './cloud/useCloudAutosave'
import { MotionPermissionGate } from './motion/MotionPermissionGate'
import { useDeviceOrientation } from './motion/useDeviceOrientation'
import { useMotionPermission } from './motion/useMotionPermission'
import { useEditorStore } from './state/useEditorStore'
import { ArOverlay } from './ui/ArOverlay'
import { CameraControl } from './ui/CameraControl'
import { CameraPanel } from './ui/CameraPanel'
import { ControlRail } from './ui/ControlRail'
import { GenerationPhase } from './ui/GenerationPhase'
import { LibrarySheet } from './ui/LibrarySheet'
import { PreviewPanel } from './ui/PreviewPanel'
import { ProjectHud } from './ui/ProjectHud'
import { SelectionBar } from './ui/SelectionBar'
import { VoiceChip } from './ui/VoiceChip'
import { useVoiceCommands } from './voice/useVoiceCommands'

/**
 * App shell: owns the cross-cutting hooks (motion + voice commands) and
 * composes the 3D experience with the mobile-first UI layer. Editor / film
 * state lives in the zustand store (the Project document).
 */
function App() {
  const { permission, request } = useMotionPermission()
  const { stateRef, active } = useDeviceOrientation(permission === 'granted')
  const { voice, submitCommand } = useVoiceCommands()
  const preview = useEditorStore((s) => s.preview)
  useCloudAutosave()

  // Phone camera-control mode (desktop→device handoff): a focused full-screen
  // recorder, no editor chrome. Loads the project via `?project=` in useCloudAutosave.
  if (isCameraRemote()) {
    return (
      <div className="app app--remote">
        <Experience motionRef={stateRef} motionActive={active} />
        <CameraControl />
        <MotionPermissionGate permission={permission} onRequest={request} />
      </div>
    )
  }

  return (
    <div className={`app ${preview ? 'app--preview' : ''}`}>
      <Experience motionRef={stateRef} motionActive={active} />

      <ProjectHud submitCommand={submitCommand} />
      <VoiceChip voice={voice} />
      <SelectionBar />
      <ControlRail />
      <LibrarySheet />
      <CameraPanel />
      <PreviewPanel />
      <ArOverlay />
      <GenerationPhase />

      <MotionPermissionGate permission={permission} onRequest={request} />
    </div>
  )
}

export default App
