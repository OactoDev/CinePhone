import { useEffect, useRef, useState } from 'react'
import type { VoiceState } from '../types/voice'

/**
 * Minimal Web Speech API wrapper. Auto-starts continuous recognition, exposes
 * the live (interim) transcript for display, and calls `onFinal` once per
 * finalized phrase so a command parser can consume a clean stream. No-ops
 * gracefully where the API is unavailable (e.g. most iOS browsers).
 *
 * Requires a microphone grant and a secure (HTTPS) context — both already
 * provided by the app.
 */

interface Options {
  /** Called once per finalized utterance with its text. */
  onFinal?: (text: string) => void
}

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

export function useSpeechRecognition(options: Options = {}): VoiceState {
  const supported = typeof window !== 'undefined' && getCtor() !== null
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const stoppedRef = useRef(false)
  const onFinalRef = useRef(options.onFinal)
  onFinalRef.current = options.onFinal

  useEffect(() => {
    const Ctor = getCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          onFinalRef.current?.(text.trim())
        } else {
          interim += text
        }
      }
      setTranscript(interim.trim())
    }
    recognition.onend = () => {
      setListening(false)
      if (!stoppedRef.current) {
        try {
          recognition.start()
        } catch {
          /* start() throws if called too soon; wait for the next onend */
        }
      }
    }
    recognition.onerror = () => {
      /* onend follows and retries */
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
