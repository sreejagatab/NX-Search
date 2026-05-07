import { useState, useRef, useCallback } from 'react'

// Typed interface for the Web Speech API (not in all TS lib versions)
interface ISpeechRecognitionEvent extends Event {
  results: { 0: { transcript: string; confidence: number }; length: number }[]
}
interface ISpeechRecognitionErrorEvent extends Event {
  error: string
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  onstart: (() => void) | null
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  onerror: ((e: ISpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => ISpeechRecognition

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>
  return (w['SpeechRecognition'] as SpeechRecognitionCtor) || (w['webkitSpeechRecognition'] as SpeechRecognitionCtor) || null
}

export function isVoiceSupported(): boolean {
  return getSpeechRecognition() !== null
}

export type VoiceState = 'idle' | 'listening' | 'error'

export function useVoiceSearch(onResult: (transcript: string) => void) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) { setError('Voice search not supported in this browser'); return }
    if (state === 'listening') { recognitionRef.current?.stop(); return }

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => { setState('listening'); setError(null) }
    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim()
      if (transcript) onResult(transcript)
      setState('idle')
    }
    recognition.onerror = (e: ISpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech') setState('idle')
      else { setError(e.error === 'not-allowed' ? 'Microphone access denied' : `Voice error: ${e.error}`); setState('error') }
    }
    recognition.onend = () => setState(s => s === 'listening' ? 'idle' : s)

    recognitionRef.current = recognition
    recognition.start()
  }, [state, onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  return { state, error, start, stop, supported: isVoiceSupported() }
}
