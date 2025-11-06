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

const convertLengthToPx = (value: string | null | undefined) => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)

  if (!match) {
    return null
  }

  const [, numericPart, unitRaw] = match
  const numeric = Number.parseFloat(numericPart)

  if (Number.isNaN(numeric)) {
    return null
  }

  const unit = unitRaw.toLowerCase()

  switch (unit) {
    case 'px':
    case '':
      return numeric
    case 'pt':
      return (numeric * 96) / 72
    case 'cm':
      return (numeric * 96) / 2.54
    case 'mm':
      return (numeric * 96) / 25.4
    case 'in':
      return numeric * 96
    default:
      return null
  }
}

const enhanceRenderedContent = (root: HTMLElement) => {
  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('rtf-viewer-table')
    table.removeAttribute('border')
    table.style.removeProperty('border')
    table.style.setProperty('border-collapse', 'collapse')
    table.style.setProperty('border-spacing', '0')
    if (!table.style.width) {
      table.style.setProperty('width', '100%')
    }
  })

  root.querySelectorAll('tr').forEach((row) => {
    row.classList.add('rtf-viewer-table-row')
  })

  root.querySelectorAll('th, td').forEach((cell) => {
    cell.classList.add('rtf-viewer-table-cell')
    if (!cell.innerHTML.trim()) {
      cell.innerHTML = '&nbsp;'
    }

    if (!cell.style.padding) {
      cell.style.setProperty('padding', '7.5px 10px')
    }

    if (!cell.style.borderWidth) {
      cell.style.setProperty('border-width', '1px')
    }

    if (!cell.style.borderStyle) {
      cell.style.setProperty('border-style', 'solid')
    }

    if (!cell.style.borderColor) {
      cell.style.setProperty('border-color', '#9ca3af')
    }
  })

  root.querySelectorAll('thead th').forEach((header) => {
    header.classList.add('rtf-viewer-table-header')
    if (!header.style.backgroundColor) {
      header.style.setProperty('background-color', '#dde5f7')
    }
    if (!header.style.color) {
      header.style.setProperty('color', '#1f335a')
    }
    if (!header.style.fontWeight) {
      header.style.setProperty('font-weight', '600')
    }
  })

  root.querySelectorAll('ul').forEach((list) => {
    list.classList.add('rtf-viewer-list')
    if (!list.style.marginLeft) {
      list.style.setProperty('margin-left', '24px')
    }
    if (!list.style.paddingLeft) {
      list.style.setProperty('padding-left', '0')
    }
  })

  root.querySelectorAll('ol').forEach((list) => {
    list.classList.add('rtf-viewer-list', 'rtf-viewer-list--ordered')
    if (!list.style.marginLeft) {
      list.style.setProperty('margin-left', '28px')
    }
    if (!list.style.paddingLeft) {
      list.style.setProperty('padding-left', '0')
    }
  })

  root.querySelectorAll('li').forEach((item) => {
    item.classList.add('rtf-viewer-list-item')
  })

  root.querySelectorAll('p').forEach((paragraph) => {
    paragraph.classList.add('rtf-viewer-paragraph')

    const indentPx = convertLengthToPx(paragraph.style.textIndent ?? paragraph.style.marginLeft)
    if (indentPx && Math.abs(indentPx) >= 1) {
      paragraph.classList.add('rtf-viewer-paragraph--indented')
      paragraph.style.setProperty('--rtf-paragraph-indent', `${indentPx}px`)
    }

    const marginBottomPx = convertLengthToPx(paragraph.style.marginBottom)
    if (marginBottomPx !== null) {
      paragraph.style.setProperty('--rtf-paragraph-spacing', `${marginBottomPx}px`)
    }
  })

  root.querySelectorAll('pre').forEach((block) => {
    block.classList.add('rtf-viewer-pre')
  })

  root.querySelectorAll('code').forEach((inline) => {
    inline.classList.add('rtf-viewer-code')
  })

  root.querySelectorAll('blockquote').forEach((quote) => {
    quote.classList.add('rtf-viewer-blockquote')
  })
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
        const fragment = document.createDocumentFragment()
        elements.forEach((element) => fragment.appendChild(element))
        container.appendChild(fragment)
        enhanceRenderedContent(container)
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


