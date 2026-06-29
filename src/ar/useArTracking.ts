import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import { AR_CONFIG } from '../config/ar'
import { useEditorStore } from '../state/useEditorStore'
import type { PoseStatus } from '../types/pose'
import { loadArJs, type ArToolkitContext, type ArToolkitSource } from './loadArJs'

/**
 * Camera-based 6DoF tracking via AR.js (marker-based), used to drive the R3F
 * camera while our opaque white scene is rendered on top of (hiding) the camera
 * passthrough.
 *
 * Design: AR.js writes the camera-relative transform into a *proxy* Object3D
 * (cameraTransformMatrix mode). Each frame we decompose that matrix and apply
 * the position (scaled metres → scene units) and orientation to the real R3F
 * camera — so we take only the pose and keep our own cinematic FOV/projection.
 *
 * Must be mounted inside <Canvas>. No-op until `enabled` is true (start it from
 * a user gesture so iOS grants the camera).
 */
export function useArTracking(enabled: boolean) {
  const camera = useThree((s) => s.camera)
  const setArStatus = useEditorStore((s) => s.setArStatus)

  const rig = useRef<{
    source: ArToolkitSource
    context: ArToolkitContext
    proxy: Object3D
    ready: boolean
  } | null>(null)
  const tmpPos = useRef(new Vector3())
  const tmpQuat = useRef(new Quaternion())
  const tmpScale = useRef(new Vector3())
  const lastStatus = useRef<PoseStatus>('idle')

  // Push status to the store only when it actually changes (avoids per-frame renders).
  const reportStatus = (s: PoseStatus) => {
    if (lastStatus.current !== s) {
      lastStatus.current = s
      setArStatus(s)
    }
  }

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const setStatus = (s: PoseStatus) => !cancelled && setArStatus(s)
    setStatus('starting')

    loadArJs()
      .then((THREEx) => {
        if (cancelled) return

        const source = new THREEx.ArToolkitSource({ sourceType: 'webcam' })
        const context = new THREEx.ArToolkitContext({
          cameraParametersUrl: AR_CONFIG.cameraParamUrl,
          detectionMode: 'mono',
          maxDetectionRate: 60,
        })
        const proxy = new Object3D()
        proxy.matrixAutoUpdate = false

        source.init(
          () => {
            // Keep the camera video in the DOM (needed for detection) but pinned
            // behind the opaque canvas so the white scene is what's visible.
            const v = source.domElement
            v.style.position = 'fixed'
            v.style.top = '0'
            v.style.left = '0'
            v.style.width = '100%'
            v.style.height = '100%'
            v.style.objectFit = 'cover'
            v.style.zIndex = '-1'
            setTimeout(() => source.onResizeElement(), 200)

            context.init(() => {
              if (cancelled) return
              // eslint-disable-next-line no-new -- ArMarkerControls self-registers
              new THREEx.ArMarkerControls(context, proxy, {
                type: 'pattern',
                patternUrl: AR_CONFIG.markerPatternUrl,
                changeMatrixMode: 'cameraTransformMatrix',
                size: AR_CONFIG.markerSize,
              })
              rig.current = { source, context, proxy, ready: true }
              setStatus('searching')
            })
          },
          () => setStatus('error'),
        )
      })
      .catch(() => setStatus(navigator.mediaDevices ? 'error' : 'unsupported'))

    return () => {
      cancelled = true
      const r = rig.current
      if (r) {
        const stream = r.source.domElement?.srcObject as MediaStream | null
        stream?.getTracks().forEach((t) => t.stop())
        r.source.domElement?.remove()
        rig.current = null
      }
      camera.matrixAutoUpdate = true
      setArStatus('idle')
    }
  }, [enabled, camera, setArStatus])

  useFrame(() => {
    const r = rig.current
    if (!enabled || !r?.ready || !r.source.ready) return

    r.context.update(r.source.domElement)

    // proxy.matrix holds the camera transform relative to the marker.
    r.proxy.matrix.decompose(tmpPos.current, tmpQuat.current, tmpScale.current)

    // Marker found → object becomes visible; otherwise hold the last pose.
    if (r.proxy.visible) {
      camera.position.copy(tmpPos.current).multiplyScalar(AR_CONFIG.poseScale)
      camera.quaternion.copy(tmpQuat.current)
      reportStatus('tracking')
    } else {
      reportStatus('searching')
    }
  })
}
