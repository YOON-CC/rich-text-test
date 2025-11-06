import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { marked } from 'marked'

import './RichTextEditor.css'
import { htmlToRtf } from '../utils/htmlToRtf'
import { FontSize } from '../extensions/fontSize'
import { FontFamily } from '../extensions/fontFamily'

const INITIAL_CONTENT = `<p>hellow</p>`

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

const RichTextEditor = () => {
  const editorRef = useRef<Editor | null>(null)
  const [rtfOutput, setRtfOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewMode, ] = useState<'rtf' | 'preview'>('preview')
  const [selectionFontSize, setSelectionFontSize] = useState('')
  const [selectionFontFamily, setSelectionFontFamily] = useState('')

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        TextStyle.configure({}),
        FontFamily,
        FontSize,
        Placeholder.configure({
          placeholder: '내용을 입력하세요…',
        }),
      ],
      content: INITIAL_CONTENT,
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
          const converted = marked.parse(markdown) as string

          if (!converted) {
            return false
          }

          event.preventDefault()
          if (editorRef.current) {
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
    [],
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

  return (
    <section className="rte-container">
      <div className="rte-toolbar" role="toolbar" aria-label="서식 도구">
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
          <EditorContent className="rte-editor" editor={editor} />
        </div>

        <div className="rte-panel">
          <div className="rte-output">
            <div className="rte-output__header">
              {/* <h3>RTF 출력</h3> */}
              {/* <div className="rte-output__controls">
                <button
                  type="button"
                  className={previewMode === 'preview' ? 'active' : ''}
                  onClick={() => setPreviewMode('preview')}
                >
                  미리보기
                </button>
                <button
                  type="button"
                  className={previewMode === 'rtf' ? 'active' : ''}
                  onClick={() => setPreviewMode('rtf')}
                >
                  RTF 원본
                </button>
              </div> */}
            </div>
            <pre aria-live="polite">{displayOutput}</pre>
            {error && <p className="rte-output__error">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default RichTextEditor


