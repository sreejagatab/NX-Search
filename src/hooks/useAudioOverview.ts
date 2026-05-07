import { useState, useCallback, useRef } from 'react'

export type AudioState = 'idle' | 'speaking' | 'paused'

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/\[(\d+)\]/g, 'source $1') // citations → "source 1"
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links
    .replace(/^[-*•]\s+/gm, '')     // bullet points
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export function isTextToSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function useAudioOverview() {
  const [state, setState] = useState<AudioState>('idle')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string) => {
    if (!isTextToSpeechSupported() || !text.trim()) return
    window.speechSynthesis.cancel()

    const clean = stripMarkdown(text)
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Prefer a natural English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setState('speaking')
    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')
    utterance.onpause = () => setState('paused')
    utterance.onresume = () => setState('speaking')

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setState('speaking')
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setState('idle')
  }, [])

  return { state, speak, pause, resume, stop, supported: isTextToSpeechSupported() }
}
