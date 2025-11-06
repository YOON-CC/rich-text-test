import { useEffect, useRef, useState } from 'react'
import html2pdf from 'html2pdf.js'

import './PdfPreview.css'

interface PdfPreviewProps {
  html: string
}

const PdfPreview = ({ html }: PdfPreviewProps) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const hiddenCanvasRef = useRef<HTMLDivElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const hiddenCanvas = hiddenCanvasRef.current

    if (!hiddenCanvas) {
      return
    }

    if (!html.trim()) {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = null
      }
      hiddenCanvas.innerHTML = ''
      setPdfUrl('')
      setError(null)
      return
    }

    hiddenCanvas.innerHTML = html
    setIsGenerating(true)
    setError(null)

    const options = {
      margin: 0.6,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait',
      },
    } as const

    html2pdf()
      .set(options)
      .from(hiddenCanvas)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const blob = pdf.output('blob') as Blob
        const url = URL.createObjectURL(blob)

        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current)
        }

        currentUrlRef.current = url
        setPdfUrl(url)
      })
      .catch((generationError: unknown) => {
        console.error(generationError)
        setError('PDF 미리보기를 생성하지 못했습니다.')
      })
      .finally(() => {
        setIsGenerating(false)
      })

    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = null
      }
    }
  }, [html])

  return (
    <div className="pdf-preview">
      <div
        ref={hiddenCanvasRef}
        className="pdf-preview__canvas rtf-viewer__content"
        aria-hidden="true"
      />

      {isGenerating && <p className="pdf-preview__status">PDF 미리보기를 생성 중입니다…</p>}
      {error && <p className="pdf-preview__error">{error}</p>}

      {!isGenerating && !error && !pdfUrl && (
        <p className="pdf-preview__status">미리볼 내용이 없습니다.</p>
      )}

      {!isGenerating && !error && pdfUrl ? (
        <iframe
          className="pdf-preview__frame"
          src={pdfUrl}
          title="PDF 미리보기"
          width="100%"
          height="100%"
        />
      ) : null}
    </div>
  )
}

export default PdfPreview
