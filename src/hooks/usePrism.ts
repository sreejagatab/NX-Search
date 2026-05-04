import { useEffect, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'

export function usePrism(content: string, lang: string) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!ref.current || !lang) return
    const grammar = Prism.languages[lang]
    if (!grammar) return
    ref.current.innerHTML = Prism.highlight(content, grammar, lang)
  }, [content, lang])
  return ref
}
