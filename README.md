# CinePhone — Phone-Motion 3D Studio

A blank 3D studio "box" you look around by physically moving your phone. Built
with **Vite + React + TypeScript + React Three Fiber**. Phone rotation drives the
camera via the DeviceOrientation API (smoothly damped); desktop falls back to
mouse OrbitControls so you can develop without a device.

## Quick start

```bash
npm install
npm run dev      # serves over HTTPS on localhost + your LAN IP
```

- **Desktop:** open the `https://localhost:5173` URL (accept the self-signed
  cert warning). Drag to look around — the OrbitControls fallback.
- **Phone (same Wi-Fi):** open the `https://<lan-ip>:5173` URL printed in the
  terminal, accept the cert warning, tap **Enable Motion**, then move/rotate the
  phone to look around the studio.

> Motion sensors require **HTTPS** and, on iOS, an explicit permission tap — both
> are handled by `@vitejs/plugin-basic-ssl` and the in-app permission gate.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | HTTPS dev server (localhost + LAN)   |
| `npm run build`   | Type-check (`tsc -b`) + prod build   |
| `npm run preview` | Preview the production build         |
| `npm run lint`    | Lint with oxlint                     |

## Architecture

The code is organised by domain so pieces can be owned independently:

```
src/
├── app/        Experience.tsx — <Canvas>, fog, shadows, ACES tone mapping
├── scene/      SceneRoot · Terrain · GridFloor · Lighting · SceneObjects
│   └── terrain/generateTerrain.ts  pure simplex-noise → BufferGeometry
├── camera/     MotionCamera (motion rig + OrbitControls) · useCameraRecorder
├── motion/     device-orientation domain (isolated, mostly testable)
│   ├── orientation.ts          pure reading → THREE.Quaternion math
│   ├── useDeviceOrientation.ts sensor subscription (ref-based, no re-render storm)
│   ├── useMotionPermission.ts  iOS requestPermission() handling
│   └── MotionPermissionGate.tsx the "Enable Motion" user-gesture button
├── voice/      useSpeechRecognition.ts — auto-listening transcript (no commands yet)
├── state/      useEditorStore.ts — zustand store (UI · scene · camera)
├── ui/         ControlRail · BottomSheet · LibrarySheet · TerrainTab · ObjectsTab
│               · CameraPanel · VoiceChip · icons
├── config/     studio.ts (atmosphere/camera) · library.ts (palette/terrain presets)
├── types/      data contracts — motion · scene · objects · terrain · camera · voice · ui
└── styles/     index.css · ui.css
```

### Mobile UI

A right-side **pill rail** (Play/Stop · Library · Camera) over the scene:

- **Library** — a half-height bottom sheet with **Terrain** (procedural presets:
  Hills/Mountains/Dunes, or Flat Grid) and **Objects** (tap to spawn primitives;
  tap a placed object to select/outline; delete or clear).
- **Camera** — record a live camera move, **Preview** it (timeline bar), and
  **Re-record** if you don't like it. Plus an FOV slider.
- **Play/Stop** — clean preview mode: hides the chrome and plays the recording.
- **Voice chip** (top) — always-listening transcript via the Web Speech API
  (Chrome; listening-only). Hidden where unsupported.

Shared UI↔scene state lives in the **zustand** store
([`src/state/useEditorStore.ts`](src/state/useEditorStore.ts)); per-frame camera
samples stay in a ref and the playback timeline is a pure CSS animation, so the
React tree never re-renders at frame rate.

### How motion control works

1. `useMotionPermission` detects whether iOS-style permission is needed and
   exposes a `request()` to call from the tap on the gate button.
2. `useDeviceOrientation` listens to `deviceorientation` once granted, writing
   the latest reading into a ref (kept out of React state to avoid re-rendering
   at 60Hz) and tracking screen orientation.
3. Each frame, `MotionCamera` feeds the reading to `orientation.ts`
   (`readingToQuaternion`) and **slerps** the camera toward the target for fluid,
   damped motion. Tune the feel via `smoothing` in `src/config/studio.ts`.

### Tuning

Everything visual/feel-related lives in [`src/config/studio.ts`](src/config/studio.ts):
background/fog, environment preset & intensity, grid colours & fade, and the
camera FOV, position, and `smoothing` factor.

### Extending

- Add objects or terrain looks by editing the catalogues in
  [`src/config/library.ts`](src/config/library.ts) — the UI and scene read from them.
- Add new scene content inside [`src/scene/SceneRoot.tsx`](src/scene/SceneRoot.tsx).
- Wire voice transcripts to actions in
  [`src/voice/useSpeechRecognition.ts`](src/voice/useSpeechRecognition.ts) +
  the store.
- The pure `orientation.ts` function is a natural first unit test.
- To later add positional drift/dolly, upgrade `MotionCamera` — the motion state
  contract already flows through it.
