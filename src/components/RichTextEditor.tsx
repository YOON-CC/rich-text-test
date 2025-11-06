import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

import './RichTextEditor.css'

const INITIAL_CONTENT = `
<h2>TipTap 기반 리치 텍스트 에디터</h2>
<p>왼쪽 상단의 버튼을 눌러 다양한 스타일을 적용해 보세요.</p>
`

const RichTextEditor = () => {
  const [htmlOutput, setHtmlOutput] = useState('')

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Placeholder.configure({
          placeholder: '내용을 입력하세요…',
        }),
      ],
      content: INITIAL_CONTENT,
      onCreate: ({ editor: currentEditor }) => {
        setHtmlOutput(currentEditor.getHTML())
      },
      onUpdate: ({ editor: currentEditor }) => {
        setHtmlOutput(currentEditor.getHTML())
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

  return (
    <section className="rte-container">
      <div className="rte-toolbar" role="toolbar" aria-label="서식 도구">
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

      <EditorContent className="rte-editor" editor={editor} />

      <div className="rte-output">
        <h3>HTML 출력</h3>
        <pre>{htmlOutput}</pre>
      </div>
    </section>
  )
}

export default RichTextEditor


