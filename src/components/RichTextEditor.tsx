import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import { marked } from 'marked'

import './RichTextEditor.css'
import { htmlToRtf } from '../utils/htmlToRtf'
import { FontSize } from '../extensions/fontSize'
import { FontFamily } from '../extensions/fontFamily'
import RtfViewer from './RtfViewer'
import randomSample from '../assets/random-sample.md?raw'

const lowlight = createLowlight(common)
lowlight.register({ javascript })
lowlight.register({ typescript })
lowlight.registerAlias({ javascript: ['js'] })
lowlight.registerAlias({ typescript: ['ts'] })

marked.setOptions({
  gfm: true,
  breaks: true,
})

const FONT_SIZES = Array.from({ length: 23 }, (_, index) => 10 + index)

const FONT_FAMILIES = [
  { label: '기본 (기본 폰트)', value: '' },
  { label: 'Noto Sans KR', value: 'Noto Sans KR' },
  { label: 'Noto Serif KR', value: 'Noto Serif KR' },
  { label: 'Nanum Gothic', value: 'Nanum Gothic' },
  { label: 'Nanum Myeongjo', value: 'Nanum Myeongjo' },
  { label: '맑은 고딕', value: 'Malgun Gothic' },
  { label: '돋움', value: 'Dotum' },
  { label: '굴림', value: 'Gulim' },
  { label: '바탕', value: 'Batang' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Times New Roman', value: 'Times New Roman' },
]

const parseFontSizeValue = (value?: string | null) => {
  if (!value) {
    return ''
  }

  const numeric = Number.parseFloat(value)

  if (Number.isNaN(numeric)) {
    return ''
  }

  return Math.round(numeric).toString()
}

const parseFontFamilyValue = (value?: string | null) => {
  if (!value) {
    return ''
  }

  const sanitized = value.split(',')[0]?.trim() ?? ''
  return sanitized.replace(/^['"]|['"]$/g, '')
}

const convertMarkdownToHtml = (markdown: string) => {
  const html = marked.parse(markdown) as string

  if (typeof window === 'undefined') {
    return html
  }

  const container = document.createElement('div')
  container.innerHTML = html
  normalizeTaskListMarkup(container)

  return container.innerHTML
}

const normalizeTaskListMarkup = (root: HTMLElement) => {
  const taskItems = Array.from(root.querySelectorAll('li'))

  taskItems.forEach((li) => {
    if (li.getAttribute('data-type') === 'taskItem') {
      return
    }

    const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null

    if (!checkbox) {
      return
    }

    const parent = li.parentElement
    if (parent && parent.tagName.toLowerCase() === 'ul') {
      parent.setAttribute('data-type', 'taskList')
    }

    const checked = checkbox.hasAttribute('checked') || checkbox.checked

    li.setAttribute('data-type', 'taskItem')
    li.setAttribute('data-checked', checked ? 'true' : 'false')

    const label = document.createElement('label')
    label.setAttribute('contenteditable', 'false')
    label.classList.add('task-item-label')

    const indicator = document.createElement('input')
    indicator.setAttribute('type', 'checkbox')
    indicator.setAttribute('disabled', 'disabled')
    if (checked) {
      indicator.setAttribute('checked', 'checked')
    }

    const indicatorSpan = document.createElement('span')

    label.append(indicator, indicatorSpan)

    const nodesToPreserve = Array.from(li.childNodes).filter((node) => node !== checkbox)

    checkbox.remove()

    li.replaceChildren()
    li.append(label)

    const contentWrapper = document.createElement('div')
    nodesToPreserve.forEach((node) => {
      contentWrapper.appendChild(node)
    })

    if (!contentWrapper.innerHTML.trim()) {
      contentWrapper.innerHTML = '&nbsp;'
    }

    li.append(contentWrapper)
  })
}

const RichTextEditor = () => {
  const editorRef = useRef<Editor | null>(null)
  const [rtfOutput, setRtfOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'preview' | 'rendered' | 'rtf'>('preview')
  const [selectionFontSize, setSelectionFontSize] = useState('')
  const [selectionFontFamily, setSelectionFontFamily] = useState('')

  const defaultContent = useMemo(() => convertMarkdownToHtml(randomSample), [])

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          codeBlock: false,
        }),
        TextStyle.configure({}),
        FontFamily,
        FontSize,
        Table.configure({
          resizable: false,
          HTMLAttributes: {
            class: 'rte-table',
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Placeholder.configure({
          placeholder: '내용을 입력하세요…',
        }),
      ],
      content: defaultContent,
      editorProps: {
        handlePaste: (_view, event) => {
          const clipboardData = event.clipboardData

          if (!clipboardData) {
            return false
          }

          const htmlData = clipboardData.getData('text/html')
          const textData = clipboardData.getData('text/plain')

          if (htmlData || !textData?.trim()) {
            return false
          }

          const markdown = textData.trim()
          if (!markdown) {
            return false
          }

          event.preventDefault()
          if (editorRef.current) {
            const converted = convertMarkdownToHtml(markdown)
            editorRef.current.commands.insertContent(converted)
            return true
          }

          return false
        },
      },
      onCreate: ({ editor: currentEditor }) => {
        editorRef.current = currentEditor
        setSelectionFontSize(parseFontSizeValue(currentEditor.getAttributes('textStyle').fontSize))
        setSelectionFontFamily(parseFontFamilyValue(currentEditor.getAttributes('textStyle').fontFamily))
        try {
          const html = currentEditor.getHTML()
          const rtf = htmlToRtf(html)
          setRtfOutput(rtf)
          setError(null)
        } catch (err) {
          console.error(err)
          setError('RTF 변환 중 오류가 발생했습니다.')
        }
      },
      onUpdate: ({ editor: currentEditor }) => {
        editorRef.current = currentEditor
        setSelectionFontSize(parseFontSizeValue(currentEditor.getAttributes('textStyle').fontSize))
        setSelectionFontFamily(parseFontFamilyValue(currentEditor.getAttributes('textStyle').fontFamily))
        try {
          const html = currentEditor.getHTML()
          const rtf = htmlToRtf(html)
          setRtfOutput(rtf)
          setError(null)
        } catch (err) {
          console.error(err)
          setError('RTF 변환 중 오류가 발생했습니다.')
        }
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        editorRef.current = currentEditor
        setSelectionFontSize(parseFontSizeValue(currentEditor.getAttributes('textStyle').fontSize))
        setSelectionFontFamily(parseFontFamilyValue(currentEditor.getAttributes('textStyle').fontFamily))
      },
    },
    [defaultContent],
  )

  const run = (command: (editor: Editor) => void) => () => {
    if (!editor) {
      return
    }
    command(editor)
  }

  const decodedOutput = useMemo(() => {
    if (!rtfOutput) {
      return ''
    }

    return rtfOutput.replace(/\\u(-?\d+)\?/g, (match, value) => {
      const code = Number.parseInt(value, 10)

      if (Number.isNaN(code)) {
        return match
      }

      const normalized = code < 0 ? code + 0x10000 : code
      return String.fromCodePoint(normalized)
    })
  }, [rtfOutput])

  const displayOutput = previewMode === 'preview' ? decodedOutput : rtfOutput

  const handleFontSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!editor) {
      return
    }

    const value = event.target.value

    if (!value) {
      editor.chain().focus().unsetFontSize().run()
      setSelectionFontSize('')
      return
    }

    editor.chain().focus().setFontSize(`${value}px`).run()
    setSelectionFontSize(value)
  }

  const handleFontFamilyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!editor) {
      return
    }

    const value = event.target.value

    if (!value) {
      editor.chain().focus().unsetFontFamily().run()
      setSelectionFontFamily('')
      return
    }

    editor.chain().focus().setFontFamily(value).run()
    setSelectionFontFamily(value)
  }

  const handleInsertSample = () => {
    if (!editorRef.current) {
      return
    }

    const converted = convertMarkdownToHtml(randomSample)
    editorRef.current.commands.setContent(converted, { emitUpdate: true })

    const attributes = editorRef.current.getAttributes('textStyle')
    setSelectionFontSize(parseFontSizeValue(attributes.fontSize))
    setSelectionFontFamily(parseFontFamilyValue(attributes.fontFamily))
    setPreviewMode('preview')
  }

  const handleDownloadRtf = () => {
    if (!rtfOutput.trim()) {
      return
    }

    const blob = new Blob([rtfOutput], { type: 'application/rtf;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'document.rtf'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rte-container">
      <div className="rte-toolbar" role="toolbar" aria-label="서식 도구">
        <button type="button" onClick={handleInsertSample} className="toolbar-action">
          샘플 불러오기
        </button>
        <button type="button" onClick={handleDownloadRtf} className="toolbar-action toolbar-action--secondary">
          RTF 다운로드
        </button>
        <span className="divider" aria-hidden="true" />
        <select
          className="font-family-select"
          aria-label="글꼴"
          value={selectionFontFamily}
          onChange={handleFontFamilyChange}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
        <select
          className="font-size-select"
          aria-label="글자 크기"
          value={selectionFontSize}
          onChange={handleFontSizeChange}
        >
          <option value="">기본 (16px)</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size.toString()}>
              {size}px
            </option>
          ))}
        </select>
        <span className="divider" aria-hidden="true" />
        <button
          type="button"
          className={editor?.isActive('bold') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleBold().run())}
        >
          굵게
        </button>
        <button
          type="button"
          className={editor?.isActive('italic') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleItalic().run())}
        >
          기울임
        </button>
        <button
          type="button"
          className={editor?.isActive('strike') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleStrike().run())}
        >
          취소선
        </button>
        <span className="divider" aria-hidden="true" />
        <button
          type="button"
          className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleHeading({ level: 1 }).run())}
        >
          H1
        </button>
        <button
          type="button"
          className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleHeading({ level: 2 }).run())}
        >
          H2
        </button>
        <button
          type="button"
          className={editor?.isActive('heading', { level: 3 }) ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleHeading({ level: 3 }).run())}
        >
          H3
        </button>
        <span className="divider" aria-hidden="true" />
        <button
          type="button"
          className={editor?.isActive('bulletList') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleBulletList().run())}
        >
          글머리
        </button>
        <button
          type="button"
          className={editor?.isActive('orderedList') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleOrderedList().run())}
        >
          번호
        </button>
        <button
          type="button"
          className={editor?.isActive('blockquote') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleBlockquote().run())}
        >
          인용
        </button>
        <button
          type="button"
          className={editor?.isActive('codeBlock') ? 'active' : ''}
          onClick={run((instance) => instance.chain().focus().toggleCodeBlock().run())}
        >
          코드
        </button>
        <span className="divider" aria-hidden="true" />
        <button
          type="button"
          onClick={run((instance) => instance.chain().focus().undo().run())}
          disabled={!editor?.can().chain().focus().undo().run()}
        >
          실행취소
        </button>
        <button
          type="button"
          onClick={run((instance) => instance.chain().focus().redo().run())}
          disabled={!editor?.can().chain().focus().redo().run()}
        >
          다시실행
        </button>
      </div>

      <div className="rte-body">
        <div className="rte-panel">
          <h3 className="panel-title">리치 텍스트 편집</h3>
          <EditorContent className="rte-editor" editor={editor} />
        </div>

        <div className="rte-panel">
          <h3 className="panel-title">RTF 미리보기</h3>
          <div className="rte-output">
            <div className="rte-output__header">
              <div className="rte-output__controls">
                <button
                  type="button"
                  className={previewMode === 'preview' ? 'active' : ''}
                  onClick={() => setPreviewMode('preview')}
                >
                  텍스트 미리보기
                </button>
                <button
                  type="button"
                  className={previewMode === 'rendered' ? 'active' : ''}
                  onClick={() => setPreviewMode('rendered')}
                >
                  렌더링 화면
                </button>
                <button
                  type="button"
                  className={previewMode === 'rtf' ? 'active' : ''}
                  onClick={() => setPreviewMode('rtf')}
                >
                  RTF 원본
                </button>
              </div>
            </div>
            <div className="rte-output__body" aria-live="polite">
              {previewMode === 'rendered' ? <RtfViewer rtf={rtfOutput} /> : <pre>{displayOutput}</pre>}
            </div>
            {error && <p className="rte-output__error">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default RichTextEditor


