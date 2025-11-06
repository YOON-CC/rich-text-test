import { useEffect, useMemo, useState } from 'react'
import HtmlToRtfBrowser from 'html-to-rtf-browser'
import { marked } from 'marked'

import sampleMarkdown from '../assets/sample-notice.md?raw'
import './MarkdownToRtf.css'

const DEFAULT_MARKDOWN = sampleMarkdown.trim()

const MarkdownToRtf = () => {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [rtf, setRtf] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const converter = useMemo(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    })

    return new HtmlToRtfBrowser()
  }, [])

  useEffect(() => {
    try {
      const html = marked.parse(markdown) as string
      const rtfString = converter.convertHtmlToRtf(html)
      setRtf(rtfString)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('변환 중 오류가 발생했습니다. 마크다운 문법을 확인해 주세요.')
    }
  }, [markdown, converter])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rtf)
      setCopied(true)
    } catch (err) {
      console.error(err)
      setError('클립보드로 복사할 수 없습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  return (
    <section className="markdown-rtf" aria-labelledby="markdown-rtf-title">
      <header className="markdown-rtf__header">
        <p className="tag">Markdown → RTF</p>
        <h2 id="markdown-rtf-title">학교 알림장 RTF 변환</h2>
        <p>
          안내문 마크다운을 붙여넣으면 RTF 포맷으로 즉시 변환됩니다. 아래 출력된 RTF 전체를 복사해서
          `.rtf` 파일로 저장하면 워드 프로세서에서 동일한 서식을 확인할 수 있습니다.
        </p>
      </header>

      <div className="markdown-rtf__panes">
        <div className="markdown-rtf__pane">
          <div className="markdown-rtf__pane-header">
            <h3>입력 마크다운</h3>
            <span className="markdown-rtf__hint">필요한 내용으로 자유롭게 수정해 보세요.</span>
          </div>
          <textarea
            aria-label="마크다운 입력"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
          />
        </div>

        <div className="markdown-rtf__pane">
          <div className="markdown-rtf__pane-header">
            <h3>RTF 출력</h3>
            <div className="markdown-rtf__actions">
              <button type="button" onClick={handleCopy} disabled={!rtf}>
                {copied ? '복사 완료!' : '전체 복사'}
              </button>
              <span className="markdown-rtf__hint">복사 후 파일명.rtf로 저장</span>
            </div>
          </div>
          <textarea aria-label="RTF 출력" value={rtf} readOnly />
        </div>
      </div>

      {error && <p className="markdown-rtf__error">{error}</p>}
    </section>
  )
}

export default MarkdownToRtf


