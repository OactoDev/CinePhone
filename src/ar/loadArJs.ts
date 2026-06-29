import * as THREE from 'three'
import { AR_CONFIG } from '../config/ar'

/**
 * Lazily load the AR.js (three.js) runtime from a CDN at runtime.
 *
 * AR.js is authored against a global `THREE`, so we expose our exact three
 * instance on `window.THREE` *before* injecting the script. That makes AR.js
 * build its matrices with the same THREE classes the rest of the app uses,
 * avoiding cross-version/instance mismatches. The script then attaches a
 * `THREEx` namespace we return.
 *
 * Loading from a CDN (rather than bundling) keeps AR.js — which expects globals
 * and targets older three internals — out of our module graph.
 */

// AR.js's THREEx surface is untyped; describe just what we touch.
export interface ThreexNS {
  ArToolkitSource: new (opts: Record<string, unknown>) => ArToolkitSource
  ArToolkitContext: new (opts: Record<string, unknown>) => ArToolkitContext
  ArMarkerControls: new (
    context: ArToolkitContext,
    object3d: THREE.Object3D,
    opts: Record<string, unknown>,
  ) => unknown
}

export interface ArToolkitSource {
  init: (onReady: () => void, onError?: (e: unknown) => void) => void
  domElement: HTMLVideoElement
  ready: boolean
  onResizeElement: () => void
  copyElementSizeTo: (el: HTMLElement) => void
}

export interface ArToolkitContext {
  init: (onCompleted: () => void) => void
  update: (srcElement: HTMLVideoElement) => boolean
  getProjectionMatrix: () => number[]
  arController: unknown
}

let promise: Promise<ThreexNS> | null = null

export function loadArJs(): Promise<ThreexNS> {
  if (promise) return promise

  promise = new Promise<ThreexNS>((resolve, reject) => {
    const w = window as unknown as { THREE?: typeof THREE; THREEx?: ThreexNS }
    if (w.THREEx) {
      resolve(w.THREEx)
      return
    }
    // Share our exact three instance with AR.js.
    w.THREE = THREE

    const script = document.createElement('script')
    script.src = AR_CONFIG.runtimeUrl
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (w.THREEx) resolve(w.THREEx)
      else reject(new Error('AR.js loaded but THREEx is missing'))
    }
    script.onerror = () => reject(new Error(`Failed to load AR.js from ${AR_CONFIG.runtimeUrl}`))
    document.head.appendChild(script)
  })

  return promise
}
