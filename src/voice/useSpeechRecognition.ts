import { useEffect, useRef, useState } from 'react'
import type { VoiceState } from '../types/voice'

/**
 * Minimal Web Speech API wrapper. Auto-starts continuous recognition and
 * exposes the live (interim) transcript. Listening-only — no command parsing.
 * No-ops gracefully where the API is unavailable (e.g. most iOS browsers).
 *
 * Note: requires a user-permission grant for the microphone and a secure
 * (HTTPS) context, both of which the app already provides.
 */

// The constructor is vendor-prefixed in some browsers and untyped in TS DOM libs.
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(): VoiceState {
  const supported = typeof window !== 'undefined' && getCtor() !== null
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const stoppedRef = useRef(false)

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text.trim())
    }
    recognition.onend = () => {
      setListening(false)
      // Keep listening unless we intentionally tore down.
      if (!stoppedRef.current) {
        try {
          recognition.start()
        } catch {
          /* start() throws if called too soon; ignore and wait for next onend */
        }
      }
    }
    recognition.onerror = () => {
      // 'not-allowed' / 'no-speech' etc. — onend will follow and retry.
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      /* ignore */
    }

    return () => {
      stoppedRef.current = true
      recognition.onend = null
      recognition.stop()
    }
  }, [])

  return { supported, listening, transcript }
}
