/**
 * Camera handoff helpers. The desktop shows a QR/link that opens the app on the
 * phone in "camera remote" mode (`?camera=1&project=<id>`). The phone loads that
 * project from Aurora (the source of truth), records a camera move with its
 * motion sensors, and the recording autosaves back to the cloud — the desktop
 * then pulls the latest.
 */
export const isCameraRemote = () =>
  new URLSearchParams(window.location.search).get('camera') === '1'

/** Absolute URL to open on the phone for a given project. */
export function handoffUrl(projectId: string): string {
  const u = new URL(window.location.href)
  u.search = ''
  u.searchParams.set('camera', '1')
  u.searchParams.set('project', projectId)
  return u.toString()
}
