import { useEffect, useRef, useState } from 'react'
import type { MotionState, OrientationReading } from '../types/motion'
import { EMPTY_READING } from '../types/motion'

/**
 * Subscribes to the `deviceorientation` event and tracks screen orientation.
 *
 * Readings arrive at ~60Hz. To avoid a re-render storm we write the latest
 * value into a ref (`stateRef`) that the camera reads each frame, and only use
 * React state for the low-frequency `active` flag that the UI cares about.
 *
 * @param enabled  start listening only once permission has been granted.
 */
export function useDeviceOrientation(enabled: boolean) {
  const stateRef = useRef<MotionState>({
    reading: { ...EMPTY_READING },
    screenOrientation: 0,
    active: false,
  })
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const readScreenAngle = () =>
      typeof window.screen?.orientation?.angle === 'number'
        ? window.screen.orientation.angle
        : (window.orientation as number | undefined) ?? 0

    stateRef.current.screenOrientation = readScreenAngle()

    const onOrientation = (event: DeviceOrientationEvent) => {
      const reading: OrientationReading = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      }
      stateRef.current.reading = reading
      if (!stateRef.current.active && event.alpha !== null) {
        stateRef.current.active = true
        setActive(true)
      }
    }

    const onScreenChange = () => {
      stateRef.current.screenOrientation = readScreenAngle()
    }

    window.addEventListener('deviceorientation', onOrientation, true)
    window.addEventListener('orientationchange', onScreenChange)
    window.screen?.orientation?.addEventListener?.('change', onScreenChange)

    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true)
      window.removeEventListener('orientationchange', onScreenChange)
      window.screen?.orientation?.removeEventListener?.('change', onScreenChange)
      stateRef.current.active = false
      setActive(false)
    }
  }, [enabled])

  return { stateRef, active } as const
}
