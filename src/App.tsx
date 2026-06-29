import { Experience } from './app/Experience'
import { MotionPermissionGate } from './motion/MotionPermissionGate'
import { useDeviceOrientation } from './motion/useDeviceOrientation'
import { useMotionPermission } from './motion/useMotionPermission'
import { useEditorStore } from './state/useEditorStore'
import { CameraPanel } from './ui/CameraPanel'
import { ControlRail } from './ui/ControlRail'
import { LibrarySheet } from './ui/LibrarySheet'
import { VoiceChip } from './ui/VoiceChip'
import { useSpeechRecognition } from './voice/useSpeechRecognition'

/**
 * App shell: owns the cross-cutting hooks (motion + voice) and composes the 3D
 * experience with the mobile-first UI layer (rail, sheets, voice chip). Editor
 * navigation/scene/camera state lives in the zustand store.
 */
function App() {
  const { permission, request } = useMotionPermission()
  const { stateRef, active } = useDeviceOrientation(permission === 'granted')
  const voice = useSpeechRecognition()
  const preview = useEditorStore((s) => s.preview)

  return (
    <div className={`app ${preview ? 'app--preview' : ''}`}>
      <Experience motionRef={stateRef} motionActive={active} />

      <VoiceChip voice={voice} />
      <ControlRail />
      <LibrarySheet />
      <CameraPanel />

      <MotionPermissionGate permission={permission} onRequest={request} />
    </div>
  )
}

export default App
