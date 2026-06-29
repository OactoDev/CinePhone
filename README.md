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
│   ├── Characters.tsx · GltfCharacter.tsx  rigged GLB performers
│   ├── Character.tsx                        procedural fallback avatar
│   └── terrain/generateTerrain.ts  pure simplex-noise → BufferGeometry
├── choreo/     LLM director → character motion
│   ├── buildContext.ts          pure scene → choreographer context
│   ├── useChoreographer.ts      /api/choreograph + keyword fallback
│   └── useCharacterRuntime.ts   executes an AnimationPlan on a rig
├── camera/     MotionCamera (motion rig + OrbitControls) · useCameraRecorder
├── motion/     device-orientation domain (isolated, mostly testable)
│   ├── orientation.ts          pure reading → THREE.Quaternion math
│   ├── useDeviceOrientation.ts sensor subscription (ref-based, no re-render storm)
│   ├── useMotionPermission.ts  iOS requestPermission() handling
│   └── MotionPermissionGate.tsx the "Enable Motion" user-gesture button
├── ar/         camera-tracked 6DoF (AR.js behind a PoseSource contract)
│   ├── loadArJs.ts             runtime CDN loader (shares the app's three)
│   └── useArTracking.ts        marker pose → drives the R3F camera
├── generation/ Luma "Generate Movie" pipeline
│   ├── buildPrompt.ts          pure scene → cinematic prompt
│   ├── lumaClient.ts           talks to the /api/luma proxy + polling
│   ├── compileMovie.ts         ffmpeg.wasm concat → single MP4
│   └── useMovieGeneration.ts   capture → S3 upload → generate → compile orchestrator
├── cloud/      storageClient.ts — client for /api/storage (S3) + /api/db (Aurora)
├── voice/      command grammar + speech → store bridge
│   ├── commandGrammar.ts       pure stateful marker parser (testable)
│   ├── useSpeechRecognition.ts auto-listening; emits finalized phrases
│   └── useVoiceCommands.ts     phrases → parser → store mutations
├── state/      useEditorStore.ts — zustand store over the Project document (persisted)
├── lib/        uid.ts — id + timestamp helpers
├── ui/         ProjectHud · ControlRail · BottomSheet · LibrarySheet · TerrainTab
│               · ObjectsTab · CameraPanel · VoiceChip · icons
├── config/     studio.ts · library.ts · clips.ts · ar.ts · luma.ts
├── types/      data contracts — project · film · pose · generation · motion · scene · objects · terrain · camera · voice · ui
└── styles/     index.css · ui.css

server/         dev-only Vite middleware (keeps all secrets server-side)
  ├── lumaProxy.ts   /api/luma/* — Luma Dream Machine proxy
  ├── awsApi.ts      /api/{health,storage,db,choreograph}/* routes
  ├── awsClients.ts  S3 + RDS Data API clients from env
  ├── storage.ts     S3 keyframe upload → presigned URL
  ├── db.ts          Aurora (RDS Data API): projects + generations
  └── choreograph.ts Claude → AnimationPlan (structured outputs)

public/models/  bundled CC0/permissive rigged GLB characters
```

### Project = the single source of truth

[`src/types/project.ts`](src/types/project.ts) defines the **`Project`** document: the
one serializable object holding everything about a project — metadata
(name, `description`/context, timestamps, `schemaVersion`) and a list of
**`Scene`s**. The full hierarchy is:

```
Project → Scene → Action → Take
                ↘ Character (performer)
                ↘ objects · terrain · camera recording · fov
```

Each `Scene` owns its terrain/objects/recording/fov plus its **characters** and
its **actions** (the script). Nothing else duplicates this data.

### Generate Movie — Luma AI cinematic render

The **clapperboard** button (right rail) opens the **Generate Movie** phase: a
storyboard of scene cards (thumbnail + Luma badge, joined by arrows). Tapping
**Generate Movie** runs the pipeline:

1. **Capture** — for each scene, the camera is posed to the recorded move's
   first/last frames and rendered; pixels are read back as keyframes
   ([`SceneCapturer`](src/scene/SceneCapturer.tsx), needs `preserveDrawingBuffer`).
2. **Upload** — keyframes are uploaded to **S3** via the server (Luma can only
   fetch public URLs); the API returns a presigned GET URL so the bucket can stay
   private. Each completed render is also recorded to **Aurora**.
3. **Generate** — [`buildScenePrompt`](src/generation/buildPrompt.ts) turns the
   exact scene (terrain, objects+colours, characters, actions, camera move,
   project context) into a cinematic prompt; Luma does image-to-video per scene
   (concurrent, capped).
4. **Compile** — [`compileMovie`](src/generation/compileMovie.ts) concatenates
   the clips into one MP4 with ffmpeg.wasm; preview + **Download**.

**Architecture (all behind clean seams).** Every secret (Luma key, AWS creds)
stays server-side in **dev-server middleware** ([`server/`](server/), wired in
`vite.config.ts`); the browser only calls same-origin `/api/*`:
- `/api/luma/*` → Luma proxy ([`lumaProxy.ts`](server/lumaProxy.ts) ↔ [`lumaClient`](src/generation/lumaClient.ts)).
- `/api/storage/upload` → **S3** keyframe upload ([`storage.ts`](server/storage.ts)).
- `/api/db/*` → **Aurora** projects + generations via the RDS Data API ([`db.ts`](server/db.ts)).
- `/api/health` → which providers are configured (drives the UI notices).

Client cloud calls live in [`src/cloud/storageClient.ts`](src/cloud/storageClient.ts);
the orchestrator is [`useMovieGeneration`](src/generation/useMovieGeneration.ts).
**Cloud Save/Load** (Aurora) is in the project HUD.

**Setup (`.env`, all server-side — never bundled):**
```
LUMA_API_KEY=...            # funded Luma key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...        # or any standard AWS credential source
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...               # hosts captured keyframes (private is fine)
# Aurora Serverless v2 with the Data API enabled:
AURORA_RESOURCE_ARN=...
AURORA_SECRET_ARN=...
AURORA_DATABASE=...
```
Aurora tables (`cinephone_projects`, `cinephone_generations`) are created
automatically on first use.

#### Make it functional — step by step
1. **Luma** — confirm `LUMA_API_KEY` is set and the account has credits
   (`/api/health` reports `luma: true`).
2. **IAM** — create an IAM user/role whose policy allows: `s3:PutObject` +
   `s3:GetObject` on your bucket, `rds-data:ExecuteStatement` on the cluster, and
   `secretsmanager:GetSecretValue` on the DB secret. Put its
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` in `.env`.
3. **S3** — create a bucket, set `S3_BUCKET`. It can stay **private** (keyframes
   are handed to Luma as presigned URLs). No CORS config needed — Luma fetches
   them server-side, and final clips are proxied via `/api/luma/asset`.
4. **Aurora** — create an **Aurora Serverless v2 PostgreSQL** cluster with the
   **Data API enabled**; store its master creds in a Secrets Manager secret.
   Set `AURORA_RESOURCE_ARN` (cluster ARN), `AURORA_SECRET_ARN` (secret ARN), and
   `AURORA_DATABASE` (e.g. `postgres`). Tables auto-create on first call.
5. **Run** `npm run dev`, open the **Generate** phase. `/api/health` should read
   `{storage:true, aurora:true, luma:true}`; compose ≥2 scenes (with a recorded
   camera move) and press **Generate Movie**.

Cloud **autosave** ([`useCloudAutosave`](src/cloud/useCloudAutosave.ts)) persists
the project to Aurora on change (debounced) once it's configured; the Generate
phase lists **past renders** from `cinephone_generations`.

> **Caveats.** The API middleware is **dev-only** (Vite dev server); production
> needs the same handlers on a real backend. Each scene is a **paid** Luma
> generation (~30–60s). S3 + a funded Luma key are required to generate; without
> them the phase shows a setup notice. ffmpeg.wasm (~30MB) is lazy-loaded only
> when compiling. The AWS SDK is imported only by `server/*`, so it stays out of
> the browser bundle.

### Walk through the scene — 6DoF AR (camera tracking)

Tap the **AR** button (right rail) to enter camera-tracked **6DoF** mode: the
phone's camera drives the virtual camera so you can physically move *through* the
white scene — but the **opaque scene is rendered over the camera feed**, so you
never see passthrough (the feed is used only for tracking).

It's built behind an SDK-agnostic **`PoseSource`** contract
([`src/types/pose.ts`](src/types/pose.ts)) so the tracking backend is swappable.
The free, iOS-Safari-capable backend is **AR.js marker tracking**
([`src/ar/`](src/ar/)): the runtime is loaded from a CDN at runtime (sharing the
app's exact `three` instance), and the marker's 6DoF pose is decomposed and
applied to the R3F camera — we keep our own cinematic FOV and only take the pose.

**Setup to actually use it on a phone:**
1. Open the **Hiro** marker and print it or show it on another screen:
   <https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png>
2. Open the app over HTTPS on the phone, tap **AR**, grant camera access.
3. Point at the marker (overlay shows *searching → tracking*), then move around —
   the camera moves through the scene. The recorder still captures the move.

Config lives in `.env` (`VITE_AR_*`) — marker, marker size, and `VITE_AR_POSE_SCALE`
(metres → scene units). See [`.env.example`](.env.example). No API key needed.

> **Why marker-based?** There is no *free* markerless 6DoF that works in iOS
> Safari: WebXR `immersive-ar` isn't supported on iOS, and SLAM SDKs (8th Wall,
> Zappar) are paid. Marker tracking is the free path that runs on iPhone. To go
> markerless later, implement `PoseSource` with a commercial SDK — nothing else
> in the app needs to change.

### Environments, props & the timeline preview

- **Environments** ([config/environments.ts](src/config/environments.ts)) — pick a
  whole lighting/atmosphere mood per scene from Library → **Environment** (Studio,
  Sunset, Dawn, Night, Forest, Dungeon). Each sets its own image-based lighting,
  background, fog, and key-light colour/intensity ([Lighting.tsx](src/scene/Lighting.tsx)).
- **Props** ([config/props.ts](src/config/props.ts)) — bundled **KayKit Dungeon
  Remastered** (CC0) set pieces (barrel, crates, table, chair, pillar, torch, keg,
  candles) in `public/models/props/`, spawnable from Library → Objects → **Set
  pieces** ([SceneProps.tsx](src/scene/SceneProps.tsx)). *(KayKit City-Builder ships
  only FBX + multi-file glTF, not self-contained `.glb`, so it isn't wired —
  convert to GLB to add city pieces.)*
- **Timeline preview** ([PreviewPanel.tsx](src/ui/PreviewPanel.tsx)) — the rail
  **Play** button opens a Preview sheet that lays the scene's directed actions on
  a timeline and **replays them in order** (re-applying each stored plan, animating
  a progress bar; plays the camera recording too if one exists). Scenes start
  **empty** — spawn characters/props and direct them.

### Characters & the LLM choreographer

Scenes are populated with **rigged GLB characters** (bundled, all **CC0**, in
`public/models/`): the fantasy cast is **KayKit** — Adventurers (Knight,
Barbarian, Mage, Rogue) and Skeletons (Warrior, Mage, Minion, the "enemies") —
plus three.js **RobotExpressive** and Khronos **Fox**. They're loaded via drei
`useGLTF`/`useAnimations` and instanced with `SkeletonUtils.clone`. Each preset
([`config/characters.ts`](src/config/characters.ts)) maps a **canonical clip
vocabulary** (idle/walk/run/jump/wave/dance/attack/sit/die) to that rig's actual
clip names — the KayKit characters share one 76-clip library, so they reuse a
single alias map. Spawn them from the Library → **Objects** sheet.

> **Credits:** KayKit Character Packs (Adventurers, Skeletons) by Kay Lousberg —
> CC0. RobotExpressive (three.js), Fox (Khronos glTF-Sample-Models) — CC0. Characters without a
preset fall back to the procedural blocky avatar.

When you direct an action (voice or typed), the **LLM choreographer** turns it
into contextual motion rather than a single clip:

```
"the robot fights the fox"
  → face fox → run to fox (stop 1.5m) → attack ×3
```

- [`buildContext.ts`](src/choreo/buildContext.ts) (pure) describes the scene
  (characters, their positions + available clips, targets) for the model.
- [`server/choreograph.ts`](server/choreograph.ts) calls **Claude
  (`claude-haiku-4-5` — fastest tier — with structured outputs)** through the dev proxy
  (`/api/choreograph`) and returns a validated **`AnimationPlan`** (a sequence of
  move/face/play/wait steps). The key (`ANTHROPIC_API_KEY`) stays server-side.
- [`useCharacterRuntime.ts`](src/choreo/useCharacterRuntime.ts) executes the plan
  on each rig (lerp toward target, slerp to face, crossfade clips).
- **Fallback:** with no `ANTHROPIC_API_KEY`, [`useChoreographer.ts`](src/choreo/useChoreographer.ts)
  synthesises a one-step plan via keyword matching, so directing still works
  offline.

> The choreographer **sequences existing rig clips + locomotion** — it doesn't
> synthesise new motion. Quality depends on which clips a rig ships (e.g. attack
> needs a punch-like clip). Add your own character by dropping a `.glb` in
> `public/models/` and adding a `config/characters.ts` entry.

Set `ANTHROPIC_API_KEY=` in `.env` to enable the LLM director (`/api/health`
reports `llm: true`). It's one cheap call per action.

### Voice commands → film structure (the bridge)

Speech isn't just transcribed — it's parsed for a directing grammar:

| Say…            | Effect                                              |
| --------------- | --------------------------------------------------- |
| `create action` | appends an `Action`; following words become its description |
| `end action` / `cut` | finalises the action                           |
| `new scene`     | appends a `Scene`                                    |
| `end scene`     | closes the current scene                             |

[`commandGrammar.ts`](src/voice/commandGrammar.ts) is a **pure, stateful** parser
(a word-by-word state machine) so markers split across streaming speech results
still parse. [`useVoiceCommands.ts`](src/voice/useVoiceCommands.ts) maps its
events to store mutations. The action description is mapped to an animation clip
by plain keyword matching ([`clips.ts`](src/config/clips.ts) `resolveClip`,
e.g. "…walks…" → `walk`) — **no AI**.

**Closing the loop:** when an action resolves, the referenced `Character`
([`Character.tsx`](src/scene/Character.tsx), a procedural performer) plays the
mapped clip live in the viewfinder. Speak → character performs. A typed
**director's command** input in the HUD drives the exact same parser (handy on
desktop / where speech is unsupported).

The zustand store ([`useEditorStore.ts`](src/state/useEditorStore.ts)) holds the
`Project` plus transient runtime flags (open panel, preview, selection, camera
mode). All scene edits go through the **active scene** via `selectActiveScene`
and a `patchScene` helper that also stamps `updatedAt`. The document is
**persisted to `localStorage`** (zustand `persist`, project only) so work
survives reloads — swap the storage for a backend later without touching callers.

Manage projects/scenes from the **HUD** (top-left): edit name/context, switch,
add, rename, or delete scenes.

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
