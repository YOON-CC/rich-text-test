import { useEffect, useRef, useState } from 'react'
import { RTFJS, WMFJS, EMFJS } from 'rtf.js'

import './RtfViewer.css'

interface RtfViewerProps {
  rtf: string
}

const stringToArrayBuffer = (value: string) => {
  const buffer = new ArrayBuffer(value.length)
  const view = new Uint8Array(buffer)

  for (let index = 0; index < value.length; index += 1) {
    view[index] = value.charCodeAt(index) & 0xff
  }

  return buffer
}

const RtfViewer = ({ rtf }: RtfViewerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    container.innerHTML = ''
    setError(null)

    if (!rtf.trim()) {
      return
    }

    RTFJS.loggingEnabled(false)
    WMFJS.loggingEnabled(false)
    EMFJS.loggingEnabled(false)

    const buffer = stringToArrayBuffer(rtf)
    const documentInstance = new RTFJS.Document(buffer)
    let cancelled = false

    documentInstance
      .render()
      .then((elements: HTMLElement[]) => {
        if (cancelled) {
          return
        }

        container.innerHTML = ''
        container.append(...elements)
      })
      .catch((renderError: unknown) => {
        console.error(renderError)
        if (!cancelled) {
          setError('RTF 문서를 렌더링하지 못했습니다.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [rtf])

  return (
    <div className="rtf-viewer">
      {error ? <p className="rtf-viewer__error">{error}</p> : null}
      <div ref={containerRef} className="rtf-viewer__content" />
    </div>
  )
}

export default RtfViewer


