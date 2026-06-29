import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import {
  getHealth,
  listGenerationsCloud,
  type CloudHealth,
  type GenerationRow,
} from '../cloud/storageClient'
import { useMovieGeneration } from '../generation/useMovieGeneration'
import { useEditorStore } from '../state/useEditorStore'
import type { SceneGenStatus } from '../types/generation'
import { CloseIcon, DownloadIcon, PlayIcon } from './icons'

const STATUS_LABEL: Record<SceneGenStatus, string> = {
  idle: 'Ready',
  capturing: 'Capturing…',
  uploading: 'Uploading…',
  queued: 'Queued…',
  dreaming: 'Dreaming…',
  completed: 'Done',
  failed: 'Failed',
}

/**
 * Full-screen "Generate Movie" phase: a storyboard of scene cards (thumbnail +
 * Luma badge, connected by arrows) that turns the project into a single
 * compiled cinematic MP4 via Luma AI.
 */
export function GenerationPhase() {
  const genOpen = useEditorStore((s) => s.genOpen)
  const closeGeneration = useEditorStore((s) => s.closeGeneration)
  const projectId = useEditorStore((s) => s.project.id)
  const scenes = useEditorStore((s) => s.project.scenes)
  const generations = useEditorStore((s) => s.generations)
  const compile = useEditorStore((s) => s.compile)
  const cancelGeneration = useEditorStore((s) => s.cancelGeneration)
  const { generateMovie, captureThumbnails, retryFailed } = useMovieGeneration()

  const [running, setRunning] = useState(false)
  const [health, setHealth] = useState<CloudHealth | null>(null)
  const [history, setHistory] = useState<GenerationRow[]>([])
  const root = useRef<HTMLElement>(null)

  const loadHistory = () => {
    getHealth().then((h) => {
      setHealth(h)
      if (h.aurora) listGenerationsCloud(projectId).then(setHistory)
    })
  }
  useEffect(() => {
    if (genOpen) {
      loadHistory()
      captureThumbnails() // populate storyboard thumbnails instantly
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genOpen, projectId])

  // GSAP entrance: fade/scale the panel, then stagger in the scene cards.
  useGSAP(
    () => {
      if (!genOpen) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.genphase__head', { y: -16, opacity: 0, duration: 0.35 })
        .from('.board-item', { y: 24, opacity: 0, stagger: 0.08, duration: 0.4 }, '-=0.1')
        .from('.genphase__foot', { y: 20, opacity: 0, duration: 0.35 }, '-=0.2')
    },
    { scope: root, dependencies: [genOpen] },
  )

  if (!genOpen) return null
  // Until health resolves, optimistically allow (button still guarded server-side).
  const configured = health ? health.storage && health.luma : true

  const start = async () => {
    if (running) return
    setRunning(true)
    try {
      await generateMovie()
    } finally {
      setRunning(false)
      loadHistory() // refresh the history with the new renders
    }
  }

  const retry = async () => {
    if (running) return
    setRunning(true)
    try {
      await retryFailed()
    } finally {
      setRunning(false)
      loadHistory()
    }
  }

  const compiling = compile.status === 'loading' || compile.status === 'compiling'
  const startedCount = scenes.filter((s) => generations[s.id]).length
  const readyCount = scenes.filter((s) => generations[s.id]?.videoUrl).length
  const failedCount = scenes.filter((s) => generations[s.id]?.status === 'failed').length

  return (
    <section className="genphase" ref={root}>
      <header className="genphase__head">
        <h1 className="genphase__title">Generate Movie</h1>
        <button type="button" className="icon-btn" aria-label="Back" onClick={closeGeneration}>
          <CloseIcon />
        </button>
      </header>

      {health && !configured && (
        <div className="genphase__notice">
          Generation needs server config in <code>.env</code>:{' '}
          {!health.luma && <code>LUMA_API_KEY</code>}{' '}
          {!health.storage && <code>AWS_REGION + S3_BUCKET (+ credentials)</code>}.
        </div>
      )}

      <div className="genphase__board">
        {scenes.map((scene, i) => {
          const g = generations[scene.id]
          const status = g?.status ?? 'idle'
          return (
            <div className="board-item" key={scene.id}>
              <div className="scene-card">
                <span className="scene-card__name">{scene.name}</span>
                <div className="scene-card__frame">
                  {g?.videoUrl ? (
                    <video className="scene-card__video" src={g.videoUrl} controls playsInline muted loop />
                  ) : g?.thumbDataUrl ? (
                    <img className="scene-card__img" src={g.thumbDataUrl} alt="" />
                  ) : (
                    <div className="scene-card__placeholder" />
                  )}
                  <span className="scene-card__badge">Luma</span>
                  {status !== 'idle' && status !== 'completed' && (
                    <span className={`scene-card__status ${status === 'failed' ? 'is-failed' : ''}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  )}
                </div>
                {status === 'failed' && g?.error && <span className="scene-card__err">{g.error}</span>}
              </div>
              {i < scenes.length - 1 && <span className="board-arrow" aria-hidden>→</span>}
            </div>
          )
        })}
      </div>

      {compile.status === 'done' && compile.url ? (
        <div className="movie-result">
          <video className="movie-result__video" src={compile.url} controls playsInline />
          <a className="pill-btn" href={compile.url} download="cinephone-movie.mp4">
            <DownloadIcon size={18} /> Download movie
          </a>
        </div>
      ) : (
        compiling && (
          <div className="genphase__progress">
            Compiling… {Math.round(compile.progress * 100)}%
          </div>
        )
      )}
      {compile.status === 'failed' && <div className="genphase__notice">{compile.error}</div>}

      {startedCount > 0 && !running && (
        <div className="genphase__summary">
          <span>
            {readyCount} of {scenes.length} scene{scenes.length === 1 ? '' : 's'} ready
            {failedCount > 0 ? ` · ${failedCount} failed` : ''}
          </span>
          {failedCount > 0 && (
            <button type="button" className="ghost-btn ghost-btn--sm" onClick={retry}>
              Retry failed
            </button>
          )}
        </div>
      )}

      {health?.aurora && history.length > 0 && (
        <div className="gen-history">
          <div className="list-head">
            <span className="list-head__title">Past renders · {history.length}</span>
          </div>
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.id} className="history-row">
                <span className={`history-row__dot ${h.status === 'completed' ? 'is-ok' : ''}`} />
                <span className="history-row__desc">{h.prompt || h.scene_id}</span>
                <span className="history-row__date">{formatDate(h.created_at)}</span>
                {h.video_url && (
                  <a className="history-row__link" href={h.video_url} target="_blank" rel="noreferrer">
                    clip
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="genphase__foot">
        <button type="button" className="ghost-btn" onClick={closeGeneration} disabled={running}>
          Back
        </button>
        {running ? (
          <button type="button" className="pill-btn" onClick={cancelGeneration}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="pill-btn pill-btn--cta"
            onClick={start}
            disabled={compiling || !configured || scenes.length === 0}
          >
            <PlayIcon size={18} />
            {compile.status === 'done' ? 'Regenerate' : 'Generate Movie'}
          </button>
        )}
      </footer>
    </section>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
