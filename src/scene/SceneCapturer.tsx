import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { CameraSample } from '../types/camera'

export interface SceneFrames {
  /** Start frame (data URL). */
  frame0: string
  /** End frame (data URL) — present only when the scene has a camera move. */
  frame1?: string
}

/**
 * Mounted inside <Canvas>. Registers a capture function on the store that the
 * generation orchestrator calls. It poses the camera to the active scene's
 * recorded start/end and renders a one-off frame, reading the pixels back
 * synchronously (so it wins regardless of what the live loop does next frame).
 *
 * Requires `preserveDrawingBuffer: true` on the renderer.
 */
export function SceneCapturer() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setCaptureFn = useEditorStore((s) => s.setCaptureFn)

  useEffect(() => {
    const shoot = (sample?: CameraSample): string => {
      if (sample) {
        camera.position.set(...sample.position)
        camera.quaternion.set(...sample.quaternion)
        camera.updateMatrixWorld(true)
      }
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/jpeg', 0.92)
    }

    const capture = async (): Promise<SceneFrames> => {
      const recording = selectActiveScene(useEditorStore.getState()).recording
      const samples = recording?.samples
      if (samples && samples.length > 1) {
        return { frame0: shoot(samples[0]), frame1: shoot(samples[samples.length - 1]) }
      }
      // No camera move: just the current view.
      return { frame0: shoot() }
    }

    setCaptureFn(capture)
    return () => setCaptureFn(null)
  }, [gl, scene, camera, setCaptureFn])

  return null
}
