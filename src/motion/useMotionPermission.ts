import { useCallback, useState } from 'react'
import type { MotionPermission } from '../types/motion'

/**
 * iOS 13+ exposes `DeviceOrientationEvent.requestPermission()` and requires it
 * to be called from a user gesture (a tap). Other platforms grant access
 * implicitly. This hook abstracts that difference.
 */

type RequestPermission = () => Promise<'granted' | 'denied'>

interface DOEventStatic {
  requestPermission?: RequestPermission
}

function getInitialPermission(): MotionPermission {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return 'unsupported'
  }
  const doe = DeviceOrientationEvent as unknown as DOEventStatic
  // iOS: needs an explicit, gesture-triggered prompt.
  if (typeof doe.requestPermission === 'function') return 'prompt'
  // Other platforms: access is implicit once events fire.
  return 'granted'
}

export function useMotionPermission() {
  const [permission, setPermission] = useState<MotionPermission>(getInitialPermission)

  /** Must be invoked from a click/tap handler on iOS. */
  const request = useCallback(async (): Promise<MotionPermission> => {
    const doe = DeviceOrientationEvent as unknown as DOEventStatic
    if (typeof doe.requestPermission !== 'function') {
      const next: MotionPermission = permission === 'unsupported' ? 'unsupported' : 'granted'
      setPermission(next)
      return next
    }
    try {
      const result = await doe.requestPermission()
      const next: MotionPermission = result === 'granted' ? 'granted' : 'denied'
      setPermission(next)
      return next
    } catch {
      setPermission('denied')
      return 'denied'
    }
  }, [permission])

  return { permission, request } as const
}
